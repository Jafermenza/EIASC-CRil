import { Injectable } from '@nestjs/common';
import { CredentialStatus, CredentialType, JurisdictionLevel, MemberStatus, Prisma } from '@prisma/client';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma.service';
import { JurisdictionLevel } from '@prisma/client';

export interface ReportScope {
  regionId?: string;
  zoneId?: string;
  subcityId?: string;
  districtId?: string;
  institutionId?: string;
}

type Scope = { regionId?: string; zoneId?: string; subcityId?: string; districtId?: string; institutionId?: string };
type DateRange = { from?: string; to?: string };

@Injectable()
export class ReportingService {
  constructor(private readonly prisma: PrismaService, private readonly authorization: AuthorizationService) {}

  private async effectiveScope(user: AuthenticatedUser, requested: ReportScope): Promise<ReportScope> {
    const scope: ReportScope = { ...requested };
    switch (user.jurisdictionLevel) {
      case JurisdictionLevel.REGION: scope.regionId = user.jurisdictionId ?? undefined; break;
      case JurisdictionLevel.ZONE_CITY: scope.zoneId = user.jurisdictionId ?? undefined; break;
      case JurisdictionLevel.SUBCITY_TOWN: scope.subcityId = user.jurisdictionId ?? undefined; break;
      case JurisdictionLevel.DISTRICT: scope.districtId = user.jurisdictionId ?? undefined; break;
      case JurisdictionLevel.INSTITUTION: scope.institutionId = user.institutionId ?? user.jurisdictionId ?? undefined; break;
      default: break;
    }
    if (requested.institutionId || requested.regionId || requested.zoneId || requested.subcityId || requested.districtId) {
      await this.authorization.assertCanAccess(user, requested);
    }
    return scope;
  }

  private where(scope: ReportScope) {
    const where: Record<string, string> = {};
    if (scope.regionId) where.regionId = scope.regionId;
    if (scope.zoneId) where.zoneId = scope.zoneId;
    if (scope.subcityId) where.subcityId = scope.subcityId;
    if (scope.districtId) where.districtId = scope.districtId;
    if (scope.institutionId) where.institutionId = scope.institutionId;
    return where;
  }

  async dashboard(user: AuthenticatedUser, requested: ReportScope) {
    const scope = await this.effectiveScope(user, requested);
    const memberWhere = this.where(scope);
    const institutionWhere: Record<string, string> = {};
    if (scope.regionId) institutionWhere.regionId = scope.regionId;
    if (scope.zoneId) institutionWhere.zoneId = scope.zoneId;
    if (scope.subcityId) institutionWhere.subcityId = scope.subcityId;
    if (scope.districtId) institutionWhere.districtId = scope.districtId;
    if (scope.institutionId) institutionWhere.id = scope.institutionId;
    const applicationWhere = this.where(scope);
    const licenseWhere = scope.institutionId ? { institutionId: scope.institutionId } : scope.regionId ? { institution: { regionId: scope.regionId } } : scope.zoneId ? { institution: { zoneId: scope.zoneId } } : scope.subcityId ? { institution: { subcityId: scope.subcityId } } : scope.districtId ? { institution: { districtId: scope.districtId } } : {};

    const [members, activeMembers, institutions, activeInstitutions, pendingApplications, approvedApplications, rejectedApplications, activeLicenses, expiredLicenses, suspendedLicenses] = await Promise.all([
      this.prisma.member.count({ where: memberWhere }),
      this.prisma.member.count({ where: { ...memberWhere, status: 'ACTIVE' } }),
      this.prisma.institution.count({ where: institutionWhere }),
      this.prisma.institution.count({ where: { ...institutionWhere, status: 'ACTIVE' } }),
      this.prisma.institutionApplication.count({ where: { ...applicationWhere, status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'CORRECTION_REQUIRED', 'RESUBMITTED'] } } }),
      this.prisma.institutionApplication.count({ where: { ...applicationWhere, status: 'APPROVED' } }),
      this.prisma.institutionApplication.count({ where: { ...applicationWhere, status: 'REJECTED' } }),
      this.prisma.license.count({ where: { ...licenseWhere, status: 'ACTIVE' } }),
      this.prisma.license.count({ where: { ...licenseWhere, status: 'EXPIRED' } }),
      this.prisma.license.count({ where: { ...licenseWhere, status: 'SUSPENDED' } }),
    ]);
    return { scope, members, activeMembers, institutions, activeInstitutions, pendingApplications, approvedApplications, rejectedApplications, activeLicenses, expiredLicenses, suspendedLicenses };
  }

  async members(user: AuthenticatedUser, requested: ReportScope) {
    const scope = await this.effectiveScope(user, requested);
    const where = this.where(scope);
    const [total, active, suspended, revoked, byRegion] = await Promise.all([
      this.prisma.member.count({ where }),
      this.prisma.member.count({ where: { ...where, status: 'ACTIVE' } }),
      this.prisma.member.count({ where: { ...where, status: 'SUSPENDED' } }),
      this.prisma.member.count({ where: { ...where, status: 'REVOKED' } }),
      this.prisma.member.groupBy({ by: ['regionId'], where, _count: { _all: true } }),
    ]);
    return { scope, total, active, suspended, revoked, byRegion };
  }

  async institutions(user: AuthenticatedUser, requested: ReportScope) {
    const scope = await this.effectiveScope(user, requested);
    const where = this.where(scope);
    const [total, active, suspended, revoked, byType] = await Promise.all([
      this.prisma.institution.count({ where }),
      this.prisma.institution.count({ where: { ...where, status: 'ACTIVE' } }),
      this.prisma.institution.count({ where: { ...where, status: 'SUSPENDED' } }),
      this.prisma.institution.count({ where: { ...where, status: 'REVOKED' } }),
      this.prisma.institution.groupBy({ by: ['institutionTypeId'], where, _count: { _all: true } }),
    ]);
    return { scope, total, active, suspended, revoked, byType };
  }

  async registrations(user: AuthenticatedUser, requested: ReportScope) {
    const scope = await this.effectiveScope(user, requested);
    const where = this.where(scope);
    const [total, submitted, underReview, correction, approved, rejected] = await Promise.all([
      this.prisma.registration.count({ where }),
      this.prisma.registration.count({ where: { ...where, status: 'SUBMITTED' } }),
      this.prisma.registration.count({ where: { ...where, status: 'UNDER_REVIEW' } }),
      this.prisma.registration.count({ where: { ...where, status: 'CORRECTION' } }),
      this.prisma.registration.count({ where: { ...where, status: 'APPROVED' } }),
      this.prisma.registration.count({ where: { ...where, status: 'REJECTED' } }),
    ]);
    return { scope, total, submitted, underReview, correction, approved, rejected };
  }

  async licenses(user: AuthenticatedUser, requested: ReportScope) {
    const scope = await this.effectiveScope(user, requested);
    const where = scope.institutionId ? { institutionId: scope.institutionId } : scope.regionId ? { institution: { regionId: scope.regionId } } : scope.zoneId ? { institution: { zoneId: scope.zoneId } } : scope.subcityId ? { institution: { subcityId: scope.subcityId } } : scope.districtId ? { institution: { districtId: scope.districtId } } : {};
    const [total, active, expired, suspended, revoked] = await Promise.all([
      this.prisma.license.count({ where }),
      this.prisma.license.count({ where: { ...where, status: 'ACTIVE' } }),
      this.prisma.license.count({ where: { ...where, status: 'EXPIRED' } }),
      this.prisma.license.count({ where: { ...where, status: 'SUSPENDED' } }),
      this.prisma.license.count({ where: { ...where, status: 'REVOKED' } }),
    ]);
    return { scope, total, active, expired, suspended, revoked };
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

  async exportCsv(user: AuthenticatedUser, scope: Scope, range: DateRange = {}) {
    const [dashboard, trend] = await Promise.all([this.dashboard(user, scope, range), this.trend(user, scope, 12)]);
    const lines = ['section,metric,value', ...Object.entries(dashboard).map(([metric, value]) => `dashboard,${metric},${value}`), ...trend.flatMap((row) => Object.entries(row).filter(([key]) => key !== 'month').map(([metric, value]) => `trend_${row.month},${metric},${value}`))];
    return lines.join('\n');
  }
}
