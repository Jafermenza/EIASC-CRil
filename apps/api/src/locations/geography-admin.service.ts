import { BadRequestException, Injectable } from '@nestjs/common';
import { GeographyImportStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

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
const coord = (value: unknown, min: number, max: number): number | undefined => {
  const raw = text(value);
  if (!raw) return undefined;
  const n = Number(raw);
  if (Number.isNaN(n) || n < min || n > max) throw new BadRequestException(`Invalid coordinate value: ${raw}`);
  return n;
};

function parseCsv(input: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let field = ''; let quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (char !== '\r') field += char;
  }
  if (quoted) throw new BadRequestException('CSV contains an unterminated quoted field');
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((values) => values.some((value) => value.trim() !== ''));
}

@Injectable()
export class GeographyAdminService {
  constructor(private readonly prisma: PrismaService) {}

  private decode(fileBase64: string): Row[] {
    if (!fileBase64?.trim()) throw new BadRequestException('CSV file is required');
    const buffer = Buffer.from(fileBase64, 'base64');
    if (!buffer.length) throw new BadRequestException('CSV file is empty');
    const rows = parseCsv(buffer.toString('utf8').replace(/^\uFEFF/, ''));
    if (!rows.length) throw new BadRequestException('CSV contains no rows');
    const headers = rows[0].map((value) => value.trim());
    const missing = HEADERS.filter((header) => !headers.includes(header));
    if (missing.length) throw new BadRequestException(`Missing CSV columns: ${missing.join(', ')}`);
    return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])) as Row);
  }

  preview(fileBase64: string) {
    const rows = this.decode(fileBase64);
    const headers = HEADERS;
    const errors: string[] = [];
    const seen = new Set<string>();
    rows.forEach((row, index) => {
      const line = index + 2; const region = text(row.Region); const regionCode = text(row['Region Code']); const zone = text(row['Zone/City']); const zoneCode = text(row['Zone Code']); const subcity = text(row['Sub-city/Town']); const subcityCode = text(row['Sub-city Code']); const district = text(row['District/Woreda']); const districtCode = text(row['District Code']);
      if (!region || !regionCode || !zone || !zoneCode || !district || !districtCode) errors.push(`Row ${line}: region, zone/city and district/woreda names and codes are required`);
      if ((subcity && !subcityCode) || (!subcity && subcityCode)) errors.push(`Row ${line}: sub-city/town name and code must be supplied together`);
      try { coord(row.Latitude, -90, 90); } catch { errors.push(`Row ${line}: Latitude must be between -90 and 90`); }
      try { coord(row.Longitude, -180, 180); } catch { errors.push(`Row ${line}: Longitude must be between -180 and 180`); }
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
    const run = await this.prisma.geographyImport.create({ data: { source: 'CSV', sourceVersion: sourceVersion.trim() || 'manual', sourceUrl: 'admin-upload', importedByUserId: actorUserId } });
    let regionCount = 0; let zoneCount = 0; let subcityCount = 0; let districtCount = 0;
    try {
      await this.prisma.$transaction(async (tx) => {
        for (const row of rows) {
          const region = await tx.region.upsert({ where: { code: text(row['Region Code']) }, update: { name: text(row.Region) }, create: { code: text(row['Region Code']), name: text(row.Region) } }); regionCount += 1;
          const zone = await tx.zoneCity.upsert({ where: { code: text(row['Zone Code']) }, update: { name: text(row['Zone/City']), regionId: region.id }, create: { code: text(row['Zone Code']), name: text(row['Zone/City']), regionId: region.id } }); zoneCount += 1;
          let subcityId: string | null = null; const subcityCode = text(row['Sub-city Code']);
          if (subcityCode) { const subcity = await tx.subcityTown.upsert({ where: { code: subcityCode }, update: { name: text(row['Sub-city/Town']), zoneId: zone.id }, create: { code: subcityCode, name: text(row['Sub-city/Town']), zoneId: zone.id } }); subcityId = subcity.id; subcityCount += 1; }
          await tx.district.upsert({ where: { code: text(row['District Code']) }, update: { name: text(row['District/Woreda']), zoneId: zone.id, subcityId, latitude: coord(row.Latitude, -90, 90), longitude: coord(row.Longitude, -180, 180) }, create: { code: text(row['District Code']), name: text(row['District/Woreda']), zoneId: zone.id, subcityId, latitude: coord(row.Latitude, -90, 90), longitude: coord(row.Longitude, -180, 180) } }); districtCount += 1;
        }
      }, { timeout: 120000 });
      const unique = (key: keyof Row) => new Set(rows.map((row) => text(row[key]))).size;
      await this.prisma.geographyImport.update({ where: { id: run.id }, data: { status: GeographyImportStatus.SUCCESS, completedAt: new Date(), regionCount: unique('Region Code'), zoneCount: unique('Zone Code'), districtCount: unique('District Code'), createdCount: regionCount + zoneCount + subcityCount + districtCount } });
      return { status: 'SUCCESS', importId: run.id, regionCount: unique('Region Code'), zoneCount: unique('Zone Code'), subcityCount: new Set(rows.map((row) => text(row['Sub-city Code'])).filter(Boolean)).size, districtCount: unique('District Code') };
    } catch (error) {
      await this.prisma.geographyImport.update({ where: { id: run.id }, data: { status: GeographyImportStatus.FAILED, completedAt: new Date(), errorCount: 1, errors: { message: error instanceof Error ? error.message : String(error) } } });
      throw error;
    }
  }

  imports() { return this.prisma.geographyImport.findMany({ orderBy: { startedAt: 'desc' }, take: 50 }); }
  createRegion(code: string, name: string) { return this.prisma.region.create({ data: { code: code.trim(), name: name.trim() } }); }
  createZone(code: string, name: string, regionId: string) { return this.prisma.zoneCity.create({ data: { code: code.trim(), name: name.trim(), regionId: regionId.trim() } }); }
  createSubcity(code: string, name: string, zoneId: string) { return this.prisma.subcityTown.create({ data: { code: code.trim(), name: name.trim(), zoneId: zoneId.trim() } }); }
  createDistrict(code: string, name: string, zoneId: string, subcityId?: string) { return this.prisma.district.create({ data: { code: code.trim(), name: name.trim(), zoneId: zoneId.trim(), subcityId: subcityId?.trim() || null } }); }

  /** Lets an admin directly set/update the reference latitude/longitude for a geography record used for applicant map-location verification. */
  async setCoordinates(level: 'region' | 'zone' | 'subcity' | 'district', id: string, latitude: number, longitude: number) {
    const lat = coord(latitude, -90, 90); const lng = coord(longitude, -180, 180);
    if (lat === undefined || lng === undefined) throw new BadRequestException('latitude and longitude are required');
    const data = { latitude: lat, longitude: lng };
    switch (level) {
      case 'region': return this.prisma.region.update({ where: { id }, data });
      case 'zone': return this.prisma.zoneCity.update({ where: { id }, data });
      case 'subcity': return this.prisma.subcityTown.update({ where: { id }, data });
      case 'district': return this.prisma.district.update({ where: { id }, data });
      default: throw new BadRequestException('Invalid geography level');
    }
  }
}
