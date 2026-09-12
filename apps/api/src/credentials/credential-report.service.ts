import { BadRequestException, Injectable } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma.service';

const REPORT_ROLES: RoleCode[] = [RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN];

@Injectable()
export class CredentialReportService {
  constructor(private readonly prisma: PrismaService) {}
  async report(user: AuthenticatedUser, from?: string, to?: string) {
    if (!user.roles.some((r) => REPORT_ROLES.includes(r))) throw new BadRequestException('Credential reporting is restricted to authorized administrators');
    const start = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1); const end = to ? new Date(to) : new Date();
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) throw new BadRequestException('Invalid report date range');
    const regionId = user.roles.includes(RoleCode.REGIONAL_ADMIN) ? user.jurisdictionId : null;
    if (user.roles.includes(RoleCode.REGIONAL_ADMIN) && !regionId) throw new BadRequestException('Regional administrator has no region scope');
    const scope = regionId ? `AND COALESCE(m."regionId", i."regionId", li."regionId") = '${regionId.replace(/'/g, "''")}'::uuid` : '';
    const summary = await this.prisma.$queryRawUnsafe<Array<{ type: string; status: string; count: bigint }>>(`SELECT c.type,c.status,COUNT(*)::bigint AS count FROM "Credential" c LEFT JOIN "Member" m ON m.id=c."memberId" LEFT JOIN "Institution" i ON i.id=c."institutionId" LEFT JOIN "License" l ON l.id=c."licenseId" LEFT JOIN "Institution" li ON li.id=l."institutionId" WHERE c."issuedAt" >= $1 AND c."issuedAt" <= $2 ${scope} GROUP BY c.type,c.status ORDER BY c.type,c.status`, start, end);
    const trends = await this.prisma.$queryRawUnsafe<Array<{ period: string; type: string; count: bigint }>>(`SELECT TO_CHAR(DATE_TRUNC('month',c."issuedAt"),'YYYY-MM') AS period,c.type,COUNT(*)::bigint AS count FROM "Credential" c LEFT JOIN "Member" m ON m.id=c."memberId" LEFT JOIN "Institution" i ON i.id=c."institutionId" LEFT JOIN "License" l ON l.id=c."licenseId" LEFT JOIN "Institution" li ON li.id=l."institutionId" WHERE c."issuedAt" >= $1 AND c."issuedAt" <= $2 ${scope} GROUP BY 1,2 ORDER BY 1,2`, start, end);
    const regions = await this.prisma.$queryRawUnsafe<Array<{ region: string; count: bigint }>>(`SELECT COALESCE(mr.name,ir.name,lr.name,'Unassigned') AS region,COUNT(*)::bigint AS count FROM "Credential" c LEFT JOIN "Member" m ON m.id=c."memberId" LEFT JOIN "Region" mr ON mr.id=m."regionId" LEFT JOIN "Institution" i ON i.id=c."institutionId" LEFT JOIN "Region" ir ON ir.id=i."regionId" LEFT JOIN "License" l ON l.id=c."licenseId" LEFT JOIN "Institution" li ON li.id=l."institutionId" LEFT JOIN "Region" lr ON lr.id=li."regionId" WHERE c."issuedAt" >= $1 AND c."issuedAt" <= $2 ${scope} GROUP BY 1 ORDER BY count DESC`, start, end);
    const upcoming = await this.prisma.$queryRawUnsafe<Array<{ id: string; credentialNumber: string; type: string; expiresAt: Date }>>(`SELECT c.id,c."credentialNumber",c.type,c."expiresAt" FROM "Credential" c LEFT JOIN "Member" m ON m.id=c."memberId" LEFT JOIN "Institution" i ON i.id=c."institutionId" LEFT JOIN "License" l ON l.id=c."licenseId" LEFT JOIN "Institution" li ON li.id=l."institutionId" WHERE c.status='ACTIVE' AND c."expiresAt" IS NOT NULL AND c."expiresAt" <= CURRENT_TIMESTAMP + INTERVAL '30 days' AND c."expiresAt" >= CURRENT_TIMESTAMP ${scope} ORDER BY c."expiresAt" ASC LIMIT 100`);
    return { from:start.toISOString(), to:end.toISOString(), totals:summary.reduce((acc,row)=>{acc[`${row.type}_${row.status}`]=Number(row.count);return acc;},{} as Record<string,number>), issued:summary.reduce((acc,row)=>{acc[row.type]=(acc[row.type]??0)+Number(row.count);return acc;},{} as Record<string,number>), trends:trends.map(r=>({period:r.period,type:r.type,count:Number(r.count)})), regionalBreakdown:regions.map(r=>({region:r.region,count:Number(r.count)})), expiringWithin30Days:upcoming };
  }
}
