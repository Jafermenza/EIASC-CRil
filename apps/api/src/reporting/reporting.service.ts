import { Injectable } from '@nestjs/common';
import { JurisdictionLevel } from '@prisma/client';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ReportingService {
  constructor(private readonly prisma: PrismaService, private readonly authorization: AuthorizationService) {}

  private async scopedWhere(user: AuthenticatedUser, scope: { regionId?: string; zoneId?: string; subcityId?: string; districtId?: string; institutionId?: string }) {
    const effectiveScope = { ...scope };
    if (!effectiveScope.regionId && !effectiveScope.zoneId && !effectiveScope.subcityId && !effectiveScope.districtId && !effectiveScope.institutionId) {
      switch (user.jurisdictionLevel) {
        case JurisdictionLevel.REGION: effectiveScope.regionId = user.jurisdictionId ?? undefined; break;
        case JurisdictionLevel.ZONE_CITY: effectiveScope.zoneId = user.jurisdictionId ?? undefined; break;
        case JurisdictionLevel.SUBCITY_TOWN: effectiveScope.subcityId = user.jurisdictionId ?? undefined; break;
        case JurisdictionLevel.DISTRICT: effectiveScope.districtId = user.jurisdictionId ?? undefined; break;
        case JurisdictionLevel.INSTITUTION: effectiveScope.institutionId = user.institutionId ?? user.jurisdictionId ?? undefined; break;
        default: break;
      }
    }
    if (effectiveScope.regionId || effectiveScope.zoneId || effectiveScope.subcityId || effectiveScope.districtId || effectiveScope.institutionId) await this.authorization.assertCanAccess(user, effectiveScope);
    const memberWhere: Record<string, unknown> = {};
    const institutionWhere: Record<string, unknown> = {};
    const applicationWhere: Record<string, unknown> = {};
    if (effectiveScope.regionId) { memberWhere.regionId = effectiveScope.regionId; institutionWhere.regionId = effectiveScope.regionId; applicationWhere.regionId = effectiveScope.regionId; }
    if (effectiveScope.zoneId) { memberWhere.zoneId = effectiveScope.zoneId; institutionWhere.zoneId = effectiveScope.zoneId; applicationWhere.zoneId = effectiveScope.zoneId; }
    if (effectiveScope.subcityId) { memberWhere.subcityId = effectiveScope.subcityId; institutionWhere.subcityId = effectiveScope.subcityId; applicationWhere.subcityId = effectiveScope.subcityId; }
    if (effectiveScope.districtId) { memberWhere.districtId = effectiveScope.districtId; institutionWhere.districtId = effectiveScope.districtId; applicationWhere.districtId = effectiveScope.districtId; }
    if (effectiveScope.institutionId) applicationWhere.institutionId = effectiveScope.institutionId;
    return { effectiveScope, memberWhere, institutionWhere, applicationWhere };
  }

  async dashboard(user: AuthenticatedUser, scope: { regionId?: string; zoneId?: string; subcityId?: string; districtId?: string; institutionId?: string }) {
    const { effectiveScope, memberWhere, institutionWhere, applicationWhere } = await this.scopedWhere(user, scope);
    const memberCounts = effectiveScope.institutionId
      ? [this.prisma.memberInstitution.count({ where: { institutionId: effectiveScope.institutionId, member: { status: 'ACTIVE' } } }), this.prisma.memberInstitution.count({ where: { institutionId: effectiveScope.institutionId, status: 'ACTIVE', member: { status: 'ACTIVE' } } })]
      : [this.prisma.member.count({ where: memberWhere }), this.prisma.member.count({ where: { ...memberWhere, status: 'ACTIVE' } })];
    const [memberPair, institutions, activeInstitutions, pendingApplications, approvedApplications, rejectedApplications, activeLicenses, expiredLicenses, suspendedLicenses] = await Promise.all([
      Promise.all(memberCounts),
      this.prisma.institution.count({ where: institutionWhere }), this.prisma.institution.count({ where: { ...institutionWhere, status: 'ACTIVE' } }),
      this.prisma.institutionApplication.count({ where: { ...applicationWhere, status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'CORRECTION_REQUIRED', 'RESUBMITTED'] } } }),
      this.prisma.institutionApplication.count({ where: { ...applicationWhere, status: 'APPROVED' } }), this.prisma.institutionApplication.count({ where: { ...applicationWhere, status: 'REJECTED' } }),
      this.prisma.license.count({ where: { institution: institutionWhere, status: 'ACTIVE' } }), this.prisma.license.count({ where: { institution: institutionWhere, status: 'EXPIRED' } }), this.prisma.license.count({ where: { institution: institutionWhere, status: 'SUSPENDED' } }),
    ]);
    return { members: memberPair[0], activeMembers: memberPair[1], institutions, activeInstitutions, pendingApplications, approvedApplications, rejectedApplications, activeLicenses, expiredLicenses, suspendedLicenses };
  }

  async trend(user: AuthenticatedUser, scope: { regionId?: string; zoneId?: string; subcityId?: string; districtId?: string; institutionId?: string }, months = 12) {
    const safeMonths = Math.min(Math.max(Math.trunc(months), 1), 24);
    const { effectiveScope, memberWhere, institutionWhere, applicationWhere } = await this.scopedWhere(user, scope);
    const rows = [];
    for (let offset = safeMonths - 1; offset >= 0; offset -= 1) {
      const start = new Date(); start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0); start.setUTCMonth(start.getUTCMonth() - offset);
      const end = new Date(start); end.setUTCMonth(end.getUTCMonth() + 1);
      const memberBase = effectiveScope.institutionId ? { member: { status: 'ACTIVE' }, institutionId: effectiveScope.institutionId, createdAt: { gte: start, lt: end } } : { ...memberWhere, createdAt: { gte: start, lt: end } };
      const [members, institutions, applications, licenses] = await Promise.all([
        effectiveScope.institutionId ? this.prisma.memberInstitution.count({ where: memberBase }) : this.prisma.member.count({ where: memberBase }),
        this.prisma.institution.count({ where: { ...institutionWhere, createdAt: { gte: start, lt: end } } }),
        this.prisma.institutionApplication.count({ where: { ...applicationWhere, createdAt: { gte: start, lt: end } } }),
        this.prisma.license.count({ where: { institution: institutionWhere, createdAt: { gte: start, lt: end } } }),
      ]);
      rows.push({ month: start.toISOString().slice(0, 7), members, institutions, applications, licenses });
    }
    return rows;
  }

  async exportCsv(user: AuthenticatedUser, scope: { regionId?: string; zoneId?: string; subcityId?: string; districtId?: string; institutionId?: string }) {
    const [dashboard, trend] = await Promise.all([this.dashboard(user, scope), this.trend(user, scope, 12)]);
    const lines = [
      'section,metric,value',
      ...Object.entries(dashboard).map(([metric, value]) => `dashboard,${metric},${value}`),
      ...trend.flatMap((row) => Object.entries(row).filter(([key]) => key !== 'month').map(([metric, value]) => `trend_${row.month},${metric},${value}`)),
    ];
    return lines.join('\n');
  }
}
