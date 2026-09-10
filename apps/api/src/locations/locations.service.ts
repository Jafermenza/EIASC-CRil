import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import ExcelJS from 'exceljs';

export interface LocationHierarchyInput {
  regionId: string;
  zoneId: string;
  subcityId: string;
  districtId: string;
}

export interface LocationRowInput {
  regionCode: string;
  regionName: string;
  zoneCode: string;
  zoneName: string;
  subcityCode: string;
  subcityName: string;
  districtCode: string;
  districtName: string;
}

export interface LocationImportResult {
  rows: number;
  regionsCreated: number;
  regionsUpdated: number;
  zonesCreated: number;
  zonesUpdated: number;
  subcitiesCreated: number;
  subcitiesUpdated: number;
  districtsCreated: number;
  districtsUpdated: number;
}

const IMPORT_HEADERS = [
  'Region Code',
  'Region Name',
  'Zone/City Code',
  'Zone/City Name',
  'Sub-city/Town Code',
  'Sub-city/Town Name',
  'District/Woreda Code',
  'District/Woreda Name',
] as const;

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
const MAX_IMPORT_ROWS = 10_000;

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  private validateParentId(parentId?: string): string | undefined {
    if (parentId === undefined) return undefined;
    const value = parentId.trim();
    if (!value) throw new BadRequestException('parentId must not be empty');
    return value;
  }

  async getRegions() {
    return this.prisma.region.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true },
    });
  }

  async getZones(regionId?: string) {
    const parentId = this.validateParentId(regionId);
    return this.prisma.zoneCity.findMany({
      where: parentId ? { regionId: parentId } : undefined,
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true, regionId: true },
    });
  }

  async getSubcities(zoneId?: string) {
    const parentId = this.validateParentId(zoneId);
    return this.prisma.subcityTown.findMany({
      where: parentId ? { zoneId: parentId } : undefined,
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true, zoneId: true },
    });
  }

  async getDistricts(parentId?: string) {
    const value = this.validateParentId(parentId);
    return this.prisma.district.findMany({
      where: value ? { subcityId: value } : undefined,
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true, subcityId: true },
    });
  }

  async createRegion(input: { code: string; name: string }, actor: AuthenticatedUser, requestId?: string) {
    const code = this.cleanCode(input.code);
    const name = this.cleanName(input.name, 'Region name');
    const region = await this.prisma.region.create({ data: { code, name } });
    await this.audit(actor.id, 'LOCATION_REGION_CREATED', 'Region', region.id, requestId, { code, name });
    return region;
  }

  async createZone(input: { code: string; name: string; regionId: string }, actor: AuthenticatedUser, requestId?: string) {
    const code = this.cleanCode(input.code);
    const name = this.cleanName(input.name, 'Zone/City name');
    const regionId = this.requiredId(input.regionId, 'Region');
    await this.requireRegion(regionId);
    const zone = await this.prisma.zoneCity.create({ data: { code, name, regionId } });
    await this.audit(actor.id, 'LOCATION_ZONE_CREATED', 'ZoneCity', zone.id, requestId, { code, name, regionId });
    return zone;
  }

  async createSubcity(input: { code: string; name: string; zoneId: string }, actor: AuthenticatedUser, requestId?: string) {
    const code = this.cleanCode(input.code);
    const name = this.cleanName(input.name, 'Sub-city/Town name');
    const zoneId = this.requiredId(input.zoneId, 'Zone/City');
    await this.requireZone(zoneId);
    const subcity = await this.prisma.subcityTown.create({ data: { code, name, zoneId } });
    await this.audit(actor.id, 'LOCATION_SUBCITY_CREATED', 'SubcityTown', subcity.id, requestId, { code, name, zoneId });
    return subcity;
  }

  async createDistrict(input: { code: string; name: string; subcityId: string }, actor: AuthenticatedUser, requestId?: string) {
    const code = this.cleanCode(input.code);
    const name = this.cleanName(input.name, 'District/Woreda name');
    const subcityId = this.requiredId(input.subcityId, 'Sub-city/Town');
    await this.requireSubcity(subcityId);
    const district = await this.prisma.district.create({ data: { code, name, subcityId } });
    await this.audit(actor.id, 'LOCATION_DISTRICT_CREATED', 'District', district.id, requestId, { code, name, subcityId });
    return district;
  }

  async importExcel(buffer: Buffer, actor: AuthenticatedUser, requestId?: string): Promise<LocationImportResult> {
    if (!buffer?.length) throw new BadRequestException('An Excel file is required');
    if (buffer.length > MAX_IMPORT_BYTES) throw new BadRequestException('Excel file must not exceed 5 MB');

    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer);
    } catch {
      throw new BadRequestException('The uploaded file is not a valid Excel workbook');
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet) throw new BadRequestException('The Excel workbook must contain one worksheet with location data');

    const rows = this.readImportRows(worksheet);
    const result: LocationImportResult = {
      rows: rows.length,
      regionsCreated: 0,
      regionsUpdated: 0,
      zonesCreated: 0,
      zonesUpdated: 0,
      subcitiesCreated: 0,
      subcitiesUpdated: 0,
      districtsCreated: 0,
      districtsUpdated: 0,
    };

    await this.prisma.$transaction(async (tx) => {
      const regionIds = new Map<string, string>();
      const zoneIds = new Map<string, string>();
      const subcityIds = new Map<string, string>();

      for (const row of rows) {
        let region = regionIds.has(row.regionCode)
          ? await tx.region.findUnique({ where: { id: regionIds.get(row.regionCode)! } })
          : await tx.region.findUnique({ where: { code: row.regionCode } });
        if (!region) {
          region = await tx.region.create({ data: { code: row.regionCode, name: row.regionName } });
          result.regionsCreated += 1;
        } else {
          this.ensureSame('Region', row.regionCode, row.regionName, region.code, region.name);
          region = await tx.region.update({ where: { id: region.id }, data: { name: row.regionName } });
          result.regionsUpdated += 1;
        }
        regionIds.set(row.regionCode, region.id);

        const existingZone = zoneIds.has(row.zoneCode)
          ? await tx.zoneCity.findUnique({ where: { id: zoneIds.get(row.zoneCode)! } })
          : await tx.zoneCity.findUnique({ where: { code: row.zoneCode } });
        let zone;
        if (!existingZone) {
          zone = await tx.zoneCity.create({ data: { code: row.zoneCode, name: row.zoneName, regionId: region.id } });
          result.zonesCreated += 1;
        } else {
          if (existingZone.regionId !== region.id) throw new BadRequestException(`Zone/City ${row.zoneCode} belongs to a different Region`);
          this.ensureSame('Zone/City', row.zoneCode, row.zoneName, existingZone.code, existingZone.name);
          zone = await tx.zoneCity.update({ where: { id: existingZone.id }, data: { name: row.zoneName } });
          result.zonesUpdated += 1;
        }
        zoneIds.set(row.zoneCode, zone.id);

        const existingSubcity = subcityIds.has(row.subcityCode)
          ? await tx.subcityTown.findUnique({ where: { id: subcityIds.get(row.subcityCode)! } })
          : await tx.subcityTown.findUnique({ where: { code: row.subcityCode } });
        let subcity;
        if (!existingSubcity) {
          subcity = await tx.subcityTown.create({ data: { code: row.subcityCode, name: row.subcityName, zoneId: zone.id } });
          result.subcitiesCreated += 1;
        } else {
          if (existingSubcity.zoneId !== zone.id) throw new BadRequestException(`Sub-city/Town ${row.subcityCode} belongs to a different Zone/City`);
          this.ensureSame('Sub-city/Town', row.subcityCode, row.subcityName, existingSubcity.code, existingSubcity.name);
          subcity = await tx.subcityTown.update({ where: { id: existingSubcity.id }, data: { name: row.subcityName } });
          result.subcitiesUpdated += 1;
        }
        subcityIds.set(row.subcityCode, subcity.id);

        const existingDistrict = await tx.district.findUnique({ where: { code: row.districtCode } });
        if (!existingDistrict) {
          await tx.district.create({ data: { code: row.districtCode, name: row.districtName, subcityId: subcity.id } });
          result.districtsCreated += 1;
        } else {
          if (existingDistrict.subcityId !== subcity.id) throw new BadRequestException(`District/Woreda ${row.districtCode} belongs to a different Sub-city/Town`);
          this.ensureSame('District/Woreda', row.districtCode, row.districtName, existingDistrict.code, existingDistrict.name);
          await tx.district.update({ where: { id: existingDistrict.id }, data: { name: row.districtName } });
          result.districtsUpdated += 1;
        }
      }

      await tx.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: 'LOCATION_EXCEL_IMPORTED',
          entityType: 'LocationHierarchy',
          requestId,
          metadata: result,
        },
      });
    });

    return result;
  }

  async createTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EIASC CRil';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Locations');
    sheet.addRow([...IMPORT_HEADERS]);
    sheet.addRow(['AA', 'Addis Ababa', 'AA-01', 'Example Zone/City', 'AA-01-01', 'Example Sub-city/Town', 'AA-01-01-01', 'Example District/Woreda']);
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = { vertical: 'middle' };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.columns = IMPORT_HEADERS.map((header) => ({ header, key: header, width: Math.max(header.length + 4, 22) }));
    sheet.getRow(2).font = { italic: true };
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private readImportRows(worksheet: ExcelJS.Worksheet): LocationRowInput[] {
    const headerMap = new Map<string, number>();
    worksheet.getRow(1).eachCell((cell, columnNumber) => {
      const header = this.normalize(cell.text);
      if (header) headerMap.set(header, columnNumber);
    });
    const missing = IMPORT_HEADERS.filter((header) => !headerMap.has(this.normalize(header)));
    if (missing.length) throw new BadRequestException(`Missing required Excel columns: ${missing.join(', ')}`);

    const rows: LocationRowInput[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const values = IMPORT_HEADERS.map((header) => this.cellValue(row, headerMap.get(this.normalize(header))!));
      if (values.every((value) => !value)) return;
      if (rows.length >= MAX_IMPORT_ROWS) throw new BadRequestException(`Excel import cannot exceed ${MAX_IMPORT_ROWS} data rows`);
      const [regionCode, regionName, zoneCode, zoneName, subcityCode, subcityName, districtCode, districtName] = values;
      const required = [regionCode, regionName, zoneCode, zoneName, subcityCode, subcityName, districtCode, districtName];
      if (required.some((value) => !value)) throw new BadRequestException(`Row ${rowNumber} is incomplete; all 8 columns are required`);
      rows.push({ regionCode, regionName, zoneCode, zoneName, subcityCode, subcityName, districtCode, districtName });
    });
    if (!rows.length) throw new BadRequestException('The Excel worksheet contains no location rows');

    const seen = new Map<string, LocationRowInput>();
    for (const row of rows) {
      const key = [row.regionCode, row.zoneCode, row.subcityCode, row.districtCode].join('|');
      const previous = seen.get(key);
      if (previous && JSON.stringify(previous) !== JSON.stringify(row)) throw new BadRequestException(`Duplicate hierarchy row has conflicting data for ${row.districtCode}`);
      seen.set(key, row);
    }
    return rows;
  }

  private cellValue(row: ExcelJS.Row, columnNumber: number): string {
    return this.normalize(row.getCell(columnNumber).text);
  }

  private normalize(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  private cleanCode(value: string): string {
    const code = this.normalize(value);
    if (!code || code.length > 50) throw new BadRequestException('Location code is required and must be at most 50 characters');
    return code;
  }

  private cleanName(value: string, field: string): string {
    const name = this.normalize(value);
    if (!name || name.length > 200) throw new BadRequestException(`${field} is required and must be at most 200 characters`);
    return name;
  }

  private requiredId(value: string, label: string): string {
    const id = value?.trim();
    if (!id) throw new BadRequestException(`${label} ID is required`);
    return id;
  }

  private async requireRegion(id: string) {
    if (!(await this.prisma.region.findUnique({ where: { id }, select: { id: true } }))) throw new BadRequestException('Region not found');
  }

  private async requireZone(id: string) {
    if (!(await this.prisma.zoneCity.findUnique({ where: { id }, select: { id: true } }))) throw new BadRequestException('Zone/City not found');
  }

  private async requireSubcity(id: string) {
    if (!(await this.prisma.subcityTown.findUnique({ where: { id }, select: { id: true } }))) throw new BadRequestException('Sub-city/Town not found');
  }

  private ensureSame(entity: string, code: string, incomingName: string, existingCode: string, existingName: string): void {
    if (code !== existingCode || incomingName !== existingName) throw new ConflictException(`${entity} ${code} already exists with different data`);
  }

  private async audit(actorUserId: string, action: string, entityType: string, entityId: string, requestId?: string, metadata?: object) {
    await this.prisma.auditLog.create({ data: { actorUserId, action, entityType, entityId, requestId, metadata } });
  }

  /**
   * Validates that all four IDs describe one continuous geographic path:
   * Region -> Zone/City -> Sub-city/Town -> District/Woreda.
   */
  async validateHierarchy(input: LocationHierarchyInput): Promise<void> {
    const ids = [input.regionId, input.zoneId, input.subcityId, input.districtId].map((id) => id.trim());
    if (ids.some((id) => !id)) throw new BadRequestException('All location IDs are required');

    const district = await this.prisma.district.findUnique({
      where: { id: ids[3] },
      select: {
        id: true,
        subcityId: true,
        subcity: {
          select: {
            id: true,
            zoneId: true,
            zone: { select: { id: true, regionId: true } },
          },
        },
      },
    });

    if (!district || district.id !== ids[3] || district.subcityId !== ids[2] || district.subcity.id !== ids[2] || district.subcity.zoneId !== ids[1] || district.subcity.zone.id !== ids[1] || district.subcity.zone.regionId !== ids[0]) {
      throw new BadRequestException('Location hierarchy is invalid');
    }
  }
}
