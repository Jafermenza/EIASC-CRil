import { ForbiddenException, Injectable } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CredentialReportService {
  constructor(private readonly prisma: PrismaService) {}

  async report(user: AuthenticatedUser, from?: string, to?: string) {
    if (!user.roles.some((r) => [RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN].includes(r))) throw new ForbiddenException('Credential reporting is restricted to authorized administrators');
    const start = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);
    const end = to ? new Date(to) : new Date();
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) throw new ForbiddenException('Invalid report date range');
    const regionId = user.roles.includes(RoleCode.REGIONAL_ADMIN) ? (user.regionId ?? user.jurisdictionId ?? null) : null;
    const scope = regionId ? this.prisma.$queryRaw<Array<{ id: string }>>`SELECT c.id FROM "Credential" c LEFT JOIN "Member" m ON m.id=c."memberId" LEFT JOIN "Institution" i ON i.id=c."institutionId" LEFT JOIN "License" l ON l.id=c."licenseId" LEFT JOIN "Institution" li ON li.id=l."institutionId" WHERE COALESCE(m."regionId", i."regionId", li."regionId")=${regionId}::uuid` : null;
    const scopedIds = scope ? (await scope).map((r) => r.id) : null;
    const where = scopedIds?.length ? `AND c.id IN (${scopedIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(',')})` : scopedIds ? 'AND FALSE' : '';
    const summary = await this.prisma.$queryRaw<Array<{ type: string; status: string; count: bigint }>>`
      SELECT c.type, c.status, COUNT(*)::bigint AS count FROM "Credential" c
      WHERE c."issuedAt" >= ${start} AND c."issuedAt" <= ${end}${this.prisma.$queryRawUnsafe(where)} GROUP BY c.type,c.status ORDER BY c.type,c.status`;
    const trends = await this.prisma.$queryRaw<Array<{ period: string; type: string; count: bigint }>>`
      SELECT TO_CHAR(DATE_TRUNC('month', c."issuedAt"),'YYYY-MM') AS period,c.type,COUNT(*)::bigint AS count FROM "Credential" c
      WHERE c."issuedAt" >= ${start} AND c."issuedAt" <= ${end}${this.prisma.$queryRawUnsafe(where)} GROUP BY 1,2 ORDER BY 1,2`;
    const regions = await this.prisma.$queryRaw<Array<{ region: string; count: bigint }>>`
      SELECT COALESCE(mr.name,ir.name,lr.name,'Unassigned') AS region,COUNT(*)::bigint AS count
      FROM "Credential" c LEFT JOIN "Member" m ON m.id=c."memberId" LEFT JOIN "Region" mr ON mr.id=m."regionId" LEFT JOIN "Institution" i ON i.id=c."institutionId" LEFT JOIN "Region" ir ON ir.id=i."regionId" LEFT JOIN "License" l ON l.id=c."licenseId" LEFT JOIN "Institution" li ON li.id=l."institutionId" LEFT JOIN "Region" lr ON lr.id=li."regionId"
      WHERE c."issuedAt" >= ${start} AND c."issuedAt" <= ${end}${this.prisma.$queryRawUnsafe(where)} GROUP BY 1 ORDER BY count DESC`;
    const upcoming = await this.prisma.$queryRaw<Array<{ id: string; credentialNumber: string; type: string; expiresAt: Date }>>`
      SELECT c.id,c."credentialNumber",c.type,c."expiresAt" FROM "Credential" c WHERE c.status='ACTIVE' AND c."expiresAt" IS NOT NULL AND c."expiresAt" <= CURRENT_TIMESTAMP + INTERVAL '30 days' AND c."expiresAt" >= CURRENT_TIMESTAMP${this.prisma.$queryRawUnsafe(where)} ORDER BY c."expiresAt" ASC LIMIT 100`;
    return {
      from: start.toISOString(), to: end.toISOString(),
      totals: summary.reduce((acc, row) => { const key = `${row.type}_${row.status}`; acc[key] = Number(row.count); return acc; }, {} as Record<string, number>),
      issued: summary.reduce((acc, row) => { acc[row.type] = (acc[row.type] ?? 0) + Number(row.count); return acc; }, {} as Record<string, number>),
      trends: trends.map((r) => ({ period: r.period, type: r.type, count: Number(r.count) })),
      regionalBreakdown: regions.map((r) => ({ region: r.region, count: Number(r.count) })),
      expiringWithin30Days: upcoming,
    };
  }
}
