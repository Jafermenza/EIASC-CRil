import { BadRequestException, Injectable } from '@nestjs/common';
import { GeographyImportStatus, PrismaService } from '@prisma/client';
import * as XLSX from 'xlsx';

type Row = {
  Region?: unknown;
  'Region Code'?: unknown;
  'Zone/City'?: unknown;
  'Zone Code'?: unknown;
  'Sub-city/Town'?: unknown;
  'Sub-city Code'?: unknown;
  'District/Woreda'?: unknown;
  'District Code'?: unknown;
  Latitude?: unknown;
  Longitude?: unknown;
};

const HEADERS = ['Region', 'Region Code', 'Zone/City', 'Zone Code', 'Sub-city/Town', 'Sub-city Code', 'District/Woreda', 'District Code', 'Latitude', 'Longitude'];
const text = (value: unknown) => typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();

@Injectable()
export class GeographyAdminService {
  constructor(private readonly prisma: PrismaService) {}

  private decode(fileBase64: string): Row[] {
    if (!fileBase64?.trim()) throw new BadRequestException('Excel file is required');
    const buffer = Buffer.from(fileBase64, 'base64');
    if (!buffer.length) throw new BadRequestException('Excel file is empty');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new BadRequestException('Excel workbook has no worksheet');
    return XLSX.utils.sheet_to_json<Row>(sheet, { defval: '' });
  }

  preview(fileBase64: string) {
    const rows = this.decode(fileBase64);
    const headers = rows.length ? Object.keys(rows[0]) : [];
    const errors: string[] = HEADERS.filter((header) => !headers.includes(header)).map((header) => `Missing column: ${header}`);
    const seen = new Set<string>();

    rows.forEach((row, index) => {
      const line = index + 2;
      const region = text(row.Region);
      const regionCode = text(row['Region Code']);
      const zone = text(row['Zone/City']);
      const zoneCode = text(row['Zone Code']);
      const subcity = text(row['Sub-city/Town']);
      const subcityCode = text(row['Sub-city Code']);
      const district = text(row['District/Woreda']);
      const districtCode = text(row['District Code']);

      if (!region || !regionCode || !zone || !zoneCode || !district || !districtCode) {
        errors.push(`Row ${line}: region, zone/city and district/woreda names and codes are required`);
      }
      if ((subcity && !subcityCode) || (!subcity && subcityCode)) {
        errors.push(`Row ${line}: sub-city/town name and code must be supplied together`);
      }
      const key = `${regionCode}|${zoneCode}|${subcityCode}|${districtCode}`;
      if (seen.has(key)) errors.push(`Row ${line}: duplicate hierarchy row ${key}`);
      seen.add(key);
    });

    return { valid: errors.length === 0, rows: rows.length, errors, headers };
  }

  async importExcel(fileBase64: string, sourceVersion: string, actorUserId?: string) {
    const preview = this.preview(fileBase64);
    if (!preview.valid) throw new BadRequestException({ message: 'Geography import validation failed', errors: preview.errors });
    const rows = this.decode(fileBase64);
    const run = await this.prisma.geographyImport.create({
      data: {
        source: 'Excel',
        sourceVersion: sourceVersion.trim() || 'manual',
        sourceUrl: 'admin-upload',
        importedByUserId: actorUserId,
      },
    });

    let regionCount = 0;
    let zoneCount = 0;
    let subcityCount = 0;
    let districtCount = 0;

    try {
      await this.prisma.$transaction(async (tx) => {
        for (const row of rows) {
          const region = await tx.region.upsert({
            where: { code: text(row['Region Code']) },
            update: { name: text(row.Region) },
            create: { code: text(row['Region Code']), name: text(row.Region) },
          });
          regionCount += 1;

          const zone = await tx.zoneCity.upsert({
            where: { code: text(row['Zone Code']) },
            update: { name: text(row['Zone/City']), regionId: region.id },
            create: { code: text(row['Zone Code']), name: text(row['Zone/City']), regionId: region.id },
          });
          zoneCount += 1;

          let subcityId: string | null = null;
          const subcityCode = text(row['Sub-city Code']);
          if (subcityCode) {
            const subcity = await tx.subcityTown.upsert({
              where: { code: subcityCode },
              update: { name: text(row['Sub-city/Town']), zoneId: zone.id },
              create: { code: subcityCode, name: text(row['Sub-city/Town']), zoneId: zone.id },
            });
            subcityId = subcity.id;
            subcityCount += 1;
          }

          await tx.district.upsert({
            where: { code: text(row['District Code']) },
            update: { name: text(row['District/Woreda']), zoneId: zone.id, subcityId },
            create: { code: text(row['District Code']), name: text(row['District/Woreda']), zoneId: zone.id, subcityId },
          });
          districtCount += 1;
        }
      }, { timeout: 120000 });

      const unique = (key: keyof Row) => new Set(rows.map((row) => text(row[key]))).size;
      await this.prisma.geographyImport.update({
        where: { id: run.id },
        data: {
          status: GeographyImportStatus.SUCCESS,
          completedAt: new Date(),
          regionCount: unique('Region Code'),
          zoneCount: unique('Zone Code'),
          districtCount: unique('District Code'),
          createdCount: regionCount + zoneCount + subcityCount + districtCount,
        },
      });

      return {
        status: 'SUCCESS',
        importId: run.id,
        regionCount: unique('Region Code'),
        zoneCount: unique('Zone Code'),
        subcityCount: new Set(rows.map((row) => text(row['Sub-city Code'])).filter(Boolean)).size,
        districtCount: unique('District Code'),
      };
    } catch (error) {
      await this.prisma.geographyImport.update({
        where: { id: run.id },
        data: {
          status: GeographyImportStatus.FAILED,
          completedAt: new Date(),
          errorCount: 1,
          errors: { message: error instanceof Error ? error.message : String(error) },
        },
      });
      throw error;
    }
  }

  imports() {
    return this.prisma.geographyImport.findMany({ orderBy: { startedAt: 'desc' }, take: 50 });
  }

  createRegion(code: string, name: string) {
    return this.prisma.region.create({ data: { code: code.trim(), name: name.trim() } });
  }

  createZone(code: string, name: string, regionId: string) {
    return this.prisma.zoneCity.create({ data: { code: code.trim(), name: name.trim(), regionId: regionId.trim() } });
  }

  createSubcity(code: string, name: string, zoneId: string) {
    return this.prisma.subcityTown.create({ data: { code: code.trim(), name: name.trim(), zoneId: zoneId.trim() } });
  }

  createDistrict(code: string, name: string, zoneId: string, subcityId?: string) {
    return this.prisma.district.create({ data: { code: code.trim(), name: name.trim(), zoneId: zoneId.trim(), subcityId: subcityId?.trim() || null } });
  }
}
