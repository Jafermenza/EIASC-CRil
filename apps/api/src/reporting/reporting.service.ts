import { ForbiddenException, Injectable } from '@nestjs/common';
import { CredentialStatus, CredentialType, JurisdictionLevel, MemberStatus, Prisma } from '@prisma/client';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma.service';

type Scope = { regionId?: string; zoneId?: string; subcityId?: string; districtId?: string; institutionId?: string };
type DateRange = { from?: string; to?: string };

@Injectable()
export class ReportingService {
  constructor(private readonly prisma: PrismaService, private readonly authorization: AuthorizationService) {}

  private async scopedWhere(user: AuthenticatedUser, scope: Scope) {
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
    if (effectiveScope.regionId || effectiveScope.zoneId || effectiveScope.subcityId || effectiveScope.districtId || effectiveScope.institutionId) {
      await this.authorization.assertCanAccess(user, effectiveScope);
    }
    const memberWhere: Prisma.MemberWhereInput = {};
    const institutionWhere: Prisma.InstitutionWhereInput = {};
    const applicationWhere: Prisma.InstitutionApplicationWhereInput = {};
    const credentialWhere: Prisma.CredentialWhereInput = {};
    if (effectiveScope.regionId) {
      memberWhere.regionId = effectiveScope.regionId; institutionWhere.regionId = effectiveScope.regionId; applicationWhere.regionId = effectiveScope.regionId;
      credentialWhere.OR = [{ member: { regionId: effectiveScope.regionId } }, { institution: { regionId: effectiveScope.regionId } }, { license: { institution: { regionId: effectiveScope.regionId } } }];
    }
    if (effectiveScope.zoneId) { memberWhere.zoneId = effectiveScope.zoneId; institutionWhere.zoneId = effectiveScope.zoneId; applicationWhere.zoneId = effectiveScope.zoneId; credentialWhere.OR = [{ member: { zoneId: effectiveScope.zoneId } }, { institution: { zoneId: effectiveScope.zoneId } }, { license: { institution: { zoneId: effectiveScope.zoneId } } }]; }
    if (effectiveScope.subcityId) { memberWhere.subcityId = effectiveScope.subcityId; institutionWhere.subcityId = effectiveScope.subcityId; applicationWhere.subcityId = effectiveScope.subcityId; credentialWhere.OR = [{ member: { subcityId: effectiveScope.subcityId } }, { institution: { subcityId: effectiveScope.subcityId } }, { license: { institution: { subcityId: effectiveScope.subcityId } } }]; }
    if (effectiveScope.districtId) { memberWhere.districtId = effectiveScope.districtId; institutionWhere.districtId = effectiveScope.districtId; applicationWhere.districtId = effectiveScope.districtId; credentialWhere.OR = [{ member: { districtId: effectiveScope.districtId } }, { institution: { districtId: effectiveScope.districtId } }, { license: { institution: { districtId: effectiveScope.districtId } } }]; }
    if (effectiveScope.institutionId) { institutionWhere.id = effectiveScope.institutionId; applicationWhere.institutionId = effectiveScope.institutionId; credentialWhere.OR = [{ institutionId: effectiveScope.institutionId }, { license: { institutionId: effectiveScope.institutionId } }]; }
    return { effectiveScope, memberWhere, institutionWhere, applicationWhere, credentialWhere };
  }

  private dateWhere(range: DateRange): { gte?: Date; lt?: Date } {
    const result: { gte?: Date; lt?: Date } = {};
    if (range.from) { const date = new Date(range.from); if (!Number.isNaN(date.getTime())) result.gte = date; }
    if (range.to) { const date = new Date(range.to); if (!Number.isNaN(date.getTime())) { date.setUTCDate(date.getUTCDate() + 1); result.lt = date; } }
    return result;
  }

  async dashboard(user: AuthenticatedUser, scope: Scope, range: DateRange = {}) {
    const { effectiveScope, memberWhere, institutionWhere, applicationWhere, credentialWhere } = await this.scopedWhere(user, scope);
    const createdAt = this.dateWhere(range);
    const memberCountWhere = Object.keys(createdAt).length ? { ...memberWhere, createdAt } : memberWhere;
    const institutionCountWhere = Object.keys(createdAt).length ? { ...institutionWhere, createdAt } : institutionWhere;
    const applicationCountWhere = Object.keys(createdAt).length ? { ...applicationWhere, createdAt } : applicationWhere;
    const credentialCountWhere = Object.keys(createdAt).length ? { ...credentialWhere, issuedAt: createdAt } : credentialWhere;
    const memberCounts = effectiveScope.institutionId
      ? [this.prisma.memberInstitution.count({ where: { institutionId: effectiveScope.institutionId, member: { status: MemberStatus.ACTIVE }, ...(Object.keys(createdAt).length ? { createdAt } : {}) } }), this.prisma.memberInstitution.count({ where: { institutionId: effectiveScope.institutionId, status: 'ACTIVE', member: { status: MemberStatus.ACTIVE }, ...(Object.keys(createdAt).length ? { createdAt } : {}) } })]
      : [this.prisma.member.count({ where: memberCountWhere }), this.prisma.member.count({ where: { ...memberCountWhere, status: MemberStatus.ACTIVE } })];
    const credentialCounts = [
      this.prisma.credential.count({ where: credentialCountWhere }),
      this.prisma.credential.count({ where: { ...credentialCountWhere, type: CredentialType.MEMBER } }),
      this.prisma.credential.count({ where: { ...credentialCountWhere, type: CredentialType.INSTITUTION } }),
      this.prisma.credential.count({ where: { ...credentialCountWhere, type: CredentialType.LICENSE } }),
      this.prisma.credential.count({ where: { ...credentialCountWhere, status: CredentialStatus.ACTIVE } }),
      this.prisma.credential.count({ where: { ...credentialCountWhere, status: CredentialStatus.EXPIRED } }),
      this.prisma.credential.count({ where: { ...credentialCountWhere, status: CredentialStatus.REVOKED } }),
    ];
    const [memberPair, institutions, activeInstitutions, pendingApplications, approvedApplications, rejectedApplications, activeLicenses, expiredLicenses, suspendedLicenses, credentials] = await Promise.all([
      Promise.all(memberCounts),
      this.prisma.institution.count({ where: institutionCountWhere }), this.prisma.institution.count({ where: { ...institutionCountWhere, status: 'ACTIVE' } }),
      this.prisma.institutionApplication.count({ where: { ...applicationCountWhere, status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'CORRECTION_REQUIRED', 'RESUBMITTED'] } } }),
      this.prisma.institutionApplication.count({ where: { ...applicationCountWhere, status: 'APPROVED' } }), this.prisma.institutionApplication.count({ where: { ...applicationCountWhere, status: 'REJECTED' } }),
      this.prisma.license.count({ where: { institution: institutionWhere, status: 'ACTIVE', ...(Object.keys(createdAt).length ? { createdAt } : {}) } }),
      this.prisma.license.count({ where: { institution: institutionWhere, status: 'EXPIRED', ...(Object.keys(createdAt).length ? { createdAt } : {}) } }),
      this.prisma.license.count({ where: { institution: institutionWhere, status: 'SUSPENDED', ...(Object.keys(createdAt).length ? { createdAt } : {}) } }),
      Promise.all(credentialCounts),
    ]);
    const [credentialIssued, memberCredentialsIssued, institutionCredentialsIssued, licenseCredentialsIssued, activeCredentials, expiredCredentials, revokedCredentials] = credentials;
    return { members: memberPair[0], activeMembers: memberPair[1], institutions, activeInstitutions, pendingApplications, approvedApplications, rejectedApplications, activeLicenses, expiredLicenses, suspendedLicenses, credentialIssued, memberCredentialsIssued, institutionCredentialsIssued, licenseCredentialsIssued, activeCredentials, expiredCredentials, revokedCredentials };
  }

  async trend(user: AuthenticatedUser, scope: Scope, months = 12) {
    const safeMonths = Math.min(Math.max(Math.trunc(months), 1), 24);
    const { effectiveScope, memberWhere, institutionWhere, applicationWhere, credentialWhere } = await this.scopedWhere(user, scope);
    const rows: Array<Record<string, string | number>> = [];
    for (let offset = safeMonths - 1; offset >= 0; offset -= 1) {
      const start = new Date(); start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0); start.setUTCMonth(start.getUTCMonth() - offset);
      const end = new Date(start); end.setUTCMonth(end.getUTCMonth() + 1);
      const credentialBase = { ...credentialWhere, issuedAt: { gte: start, lt: end } };
      const membersQuery = effectiveScope.institutionId
        ? this.prisma.memberInstitution.count({ where: { institutionId: effectiveScope.institutionId, member: { status: MemberStatus.ACTIVE }, createdAt: { gte: start, lt: end } } })
        : this.prisma.member.count({ where: { ...memberWhere, createdAt: { gte: start, lt: end } } });
      const [members, institutions, applications, licenses, credentials, memberCredentials, institutionCredentials, licenseCredentials] = await Promise.all([
        membersQuery,
        this.prisma.institution.count({ where: { ...institutionWhere, createdAt: { gte: start, lt: end } } }),
        this.prisma.institutionApplication.count({ where: { ...applicationWhere, createdAt: { gte: start, lt: end } } }),
        this.prisma.license.count({ where: { institution: institutionWhere, createdAt: { gte: start, lt: end } } }),
        this.prisma.credential.count({ where: credentialBase }),
        this.prisma.credential.count({ where: { ...credentialBase, type: CredentialType.MEMBER } }),
        this.prisma.credential.count({ where: { ...credentialBase, type: CredentialType.INSTITUTION } }),
        this.prisma.credential.count({ where: { ...credentialBase, type: CredentialType.LICENSE } }),
      ]);
      rows.push({ month: start.toISOString().slice(0, 7), members, institutions, applications, licenses, credentials, memberCredentials, institutionCredentials, licenseCredentials });
    }
    return rows;
  }

  async regionalBreakdown(user: AuthenticatedUser, scope: Scope, range: DateRange = {}) {
    const { effectiveScope } = await this.scopedWhere(user, scope);
    const regions = await this.prisma.region.findMany({ where: effectiveScope.regionId ? { id: effectiveScope.regionId } : {}, orderBy: { name: 'asc' } });
    const createdAt = this.dateWhere(range);
    return Promise.all(regions.map(async (region) => {
      const [members, institutions, credentials] = await Promise.all([
        this.prisma.member.count({ where: { regionId: region.id, ...(Object.keys(createdAt).length ? { createdAt } : {}) } }),
        this.prisma.institution.count({ where: { regionId: region.id, ...(Object.keys(createdAt).length ? { createdAt } : {}) } }),
        this.prisma.credential.count({ where: { OR: [{ member: { regionId: region.id } }, { institution: { regionId: region.id } }, { license: { institution: { regionId: region.id } } }], ...(Object.keys(createdAt).length ? { issuedAt: createdAt } : {}) } }),
      ]);
      return { regionId: region.id, region: region.name, members, institutions, credentials };
    }));
  }

  private csvCell(value: unknown) {
    const raw = String(value ?? '');
    return /[",\n\r]/.test(raw) || /^[=+@-]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
  }

  async queueSla(user: AuthenticatedUser, scope: Scope, slaHours = 48) {
    const { applicationWhere } = await this.scopedWhere(user, scope);
    const cutoff = new Date(Date.now() - Math.max(1, Math.min(720, slaHours)) * 3600000);
    const [institution, individual] = await Promise.all([
      this.prisma.institutionApplication.groupBy({ by: ['status'], where: { ...applicationWhere, status: { in: ['SUBMITTED','UNDER_REVIEW','RESUBMITTED','CORRECTION_REQUIRED'] } }, _count: { _all: true } }),
      this.prisma.registration.groupBy({ by: ['status'], where: { regionId: applicationWhere.regionId, zoneId: applicationWhere.zoneId, subcityId: applicationWhere.subcityId, districtId: applicationWhere.districtId, status: { in: ['SUBMITTED','UNDER_REVIEW','RESUBMITTED','CORRECTION'] } }, _count: { _all: true } }),
    ]);
    const overdueInstitution = await this.prisma.institutionApplication.count({ where: { ...applicationWhere, status: { in: ['SUBMITTED','UNDER_REVIEW','RESUBMITTED','CORRECTION_REQUIRED'] }, updatedAt: { lt: cutoff } } });
    const overdueIndividual = await this.prisma.registration.count({ where: { regionId: applicationWhere.regionId, zoneId: applicationWhere.zoneId, subcityId: applicationWhere.subcityId, districtId: applicationWhere.districtId, status: { in: ['SUBMITTED','UNDER_REVIEW','RESUBMITTED','CORRECTION'] }, updatedAt: { lt: cutoff } } });
    return { slaHours, cutoff, totals: { institution: institution.reduce((n, x) => n + x._count._all, 0), individual: individual.reduce((n, x) => n + x._count._all, 0) }, overdue: { institution: overdueInstitution, individual: overdueIndividual }, byStatus: { institution, individual } };
  }

  async applicationThroughput(user: AuthenticatedUser, scope: Scope, range: DateRange = {}) {
    const { applicationWhere, memberWhere } = await this.scopedWhere(user, scope);
    const createdAt = this.dateWhere(range);
    const [institution, individual] = await Promise.all([
      this.prisma.institutionApplication.groupBy({ by: ['status'], where: { ...applicationWhere, ...(Object.keys(createdAt).length ? { createdAt } : {}) }, _count: { _all: true } }),
      this.prisma.registration.groupBy({ by: ['status'], where: { regionId: memberWhere.regionId, zoneId: memberWhere.zoneId, subcityId: memberWhere.subcityId, districtId: memberWhere.districtId, ...(Object.keys(createdAt).length ? { createdAt } : {}) }, _count: { _all: true } }),
    ]);
    const [corrections, rejections] = await Promise.all([
      this.prisma.applicationCorrection.count({ where: { ...(Object.keys(createdAt).length ? { createdAt } : {}), OR: [{ institutionApplication: applicationWhere }, { registration: { regionId: memberWhere.regionId, zoneId: memberWhere.zoneId, subcityId: memberWhere.subcityId, districtId: memberWhere.districtId } }] } }),
      this.prisma.auditLog.count({ where: { action: { in: ['APPLICATION_CORRECTION_BUILT','APPLICATION_REJECTED'] }, ...(Object.keys(createdAt).length ? { createdAt } : {}) } }),
    ]);
    return { range, institution, individual, corrections, rejections };
  }

  async reviewerWorkload(user: AuthenticatedUser, scope: Scope, range: DateRange = {}) {
    const { effectiveScope } = await this.scopedWhere(user, scope);
    await this.authorization.assertCanAccess(user, effectiveScope);
    const createdAt = this.dateWhere(range);
    const rows = await this.prisma.auditLog.groupBy({ by: ['actorUserId','action'], where: { actorUserId: { not: null }, action: { in: ['APPLICATION_SNAPSHOT_CAPTURED','APPLICATION_CORRECTION_BUILT','APPLICATION_APPROVED','APPLICATION_REJECTED','INSPECTION_UPDATED'] }, ...(Object.keys(createdAt).length ? { createdAt } : {}) }, _count: { _all: true } });
    const ids = [...new Set(rows.map(r => r.actorUserId).filter((id): id is string => Boolean(id)))];
    const users = await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, email: true, phone: true } });
    return rows.map(row => ({ reviewer: users.find(u => u.id === row.actorUserId) ?? { id: row.actorUserId }, action: row.action, count: row._count._all }));
  }

  async paymentReconciliation(user: AuthenticatedUser, scope: Scope, range: DateRange = {}) {
    const { effectiveScope } = await this.scopedWhere(user, scope);
    const createdAt = this.dateWhere(range);
    const conditions = [
      Prisma.sql`TRUE`,
      effectiveScope.regionId ? Prisma.sql`COALESCE(r."regionId",ia."regionId") = ${effectiveScope.regionId}` : Prisma.sql`TRUE`,
      effectiveScope.zoneId ? Prisma.sql`COALESCE(r."zoneId",ia."zoneId") = ${effectiveScope.zoneId}` : Prisma.sql`TRUE`,
      effectiveScope.subcityId ? Prisma.sql`COALESCE(r."subcityId",ia."subcityId") = ${effectiveScope.subcityId}` : Prisma.sql`TRUE`,
      effectiveScope.districtId ? Prisma.sql`COALESCE(r."districtId",ia."districtId") = ${effectiveScope.districtId}` : Prisma.sql`TRUE`,
      effectiveScope.institutionId ? Prisma.sql`ia."institutionId" = ${effectiveScope.institutionId}` : Prisma.sql`TRUE`,
      createdAt.gte ? Prisma.sql`p."createdAt" >= ${createdAt.gte}` : Prisma.sql`TRUE`,
      createdAt.lt ? Prisma.sql`p."createdAt" < ${createdAt.lt}` : Prisma.sql`TRUE`,
    ];
    const rows = await this.prisma.$queryRaw<Array<{ status: string; method: string; count: bigint; amount: number }>>(
      Prisma.sql`SELECT p."status", p."method", COUNT(*)::bigint AS "count", COALESCE(SUM(p."amount"),0)::numeric AS "amount"
        FROM "RegistrationPayment" p
        LEFT JOIN "Registration" r ON r."id"=p."registrationId"
        LEFT JOIN "InstitutionApplication" ia ON ia."id"=p."institutionApplicationId"
        WHERE ${Prisma.join(conditions, ' AND ')}
        GROUP BY p."status", p."method" ORDER BY p."status", p."method"`,
    );
    return rows.map(row => ({ ...row, count: Number(row.count), amount: Number(row.amount) }));
  }
  async auditExport(user: AuthenticatedUser, filters: { action?: string; entityType?: string; from?: string; to?: string }) {
    if (!user.roles.includes(RoleCode.SUPER_ADMIN)) throw new ForbiddenException('Super Admin permission required');
    const createdAt = this.dateWhere(filters);
    const rows = await this.prisma.auditLog.findMany({ where: { action: filters.action?.trim() ? { contains: filters.action.trim(), mode: 'insensitive' } : undefined, entityType: filters.entityType?.trim() ? { contains: filters.entityType.trim(), mode: 'insensitive' } : undefined, ...(Object.keys(createdAt).length ? { createdAt } : {}) }, orderBy: { createdAt: 'desc' }, take: 10000, include: { actor: { select: { id: true, email: true, phone: true } } } });
    return ['timestamp,actor,action,entityType,entityId,metadata', ...rows.map(row => [row.createdAt.toISOString(),row.actor?.email ?? row.actor?.phone ?? row.actorUserId,row.action,row.entityType,row.entityId,row.metadata ? JSON.stringify(row.metadata) : ''].map(this.csvCell).join(','))].join('\n');
  }

  async exportCsv(user: AuthenticatedUser, scope: Scope, range: DateRange = {}) {
    const [dashboard, trend] = await Promise.all([this.dashboard(user, scope, range), this.trend(user, scope, 12)]);
    const lines = ['section,metric,value', ...Object.entries(dashboard).map(([metric, value]) => `dashboard,${metric},${value}`), ...trend.flatMap((row) => Object.entries(row).filter(([key]) => key !== 'month').map(([metric, value]) => `trend_${row.month},${metric},${value}`))];
    return lines.join('\n');
  }
}
