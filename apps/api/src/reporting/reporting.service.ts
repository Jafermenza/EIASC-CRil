import { Injectable } from '@nestjs/common';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma.service';
import { JurisdictionLevel } from '@prisma/client';

export interface ReportScope {
  regionId?: string;
  zoneId?: string;
  districtId?: string;
  institutionId?: string;
}

@Injectable()
export class ReportingService {
  constructor(private readonly prisma: PrismaService, private readonly authorization: AuthorizationService) {}

  private async effectiveScope(user: AuthenticatedUser, requested: ReportScope): Promise<ReportScope> {
    const scope: ReportScope = { ...requested };
    if (user.jurisdictionLevel === JurisdictionLevel.REGION) scope.regionId = user.jurisdictionId ?? undefined;
    if (user.jurisdictionLevel === JurisdictionLevel.ZONE_CITY) scope.zoneId = user.jurisdictionId ?? undefined;
    if (user.jurisdictionLevel === JurisdictionLevel.SUBCITY_TOWN) scope.zoneId = scope.zoneId;
    if (user.jurisdictionLevel === JurisdictionLevel.DISTRICT) scope.districtId = user.jurisdictionId ?? undefined;
    if (user.jurisdictionLevel === JurisdictionLevel.INSTITUTION) scope.institutionId = user.institutionId ?? user.jurisdictionId ?? undefined;
    if (requested.institutionId || requested.regionId || requested.zoneId || requested.districtId) {
      await this.authorization.assertCanAccess(user, requested);
    }
    return scope;
  }

  private where(scope: ReportScope) {
    const where: Record<string, unknown> = {};
    if (scope.regionId) where.regionId = scope.regionId;
    if (scope.zoneId) where.zoneId = scope.zoneId;
    if (scope.districtId) where.districtId = scope.districtId;
    if (scope.institutionId) where.institutionId = scope.institutionId;
    return where;
  }

  async dashboard(user: AuthenticatedUser, requested: ReportScope) {
    const scope = await this.effectiveScope(user, requested);
    const memberWhere = this.where(scope);
    const institutionWhere: Record<string, unknown> = {};
    if (scope.regionId) institutionWhere.regionId = scope.regionId;
    if (scope.zoneId) institutionWhere.zoneId = scope.zoneId;
    if (scope.districtId) institutionWhere.districtId = scope.districtId;
    if (scope.institutionId) institutionWhere.id = scope.institutionId;
    const applicationWhere = this.where(scope);
    const licenseWhere = scope.institutionId ? { institutionId: scope.institutionId } : scope.regionId ? { institution: { regionId: scope.regionId } } : scope.zoneId ? { institution: { zoneId: scope.zoneId } } : scope.districtId ? { institution: { districtId: scope.districtId } } : {};

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
    const where: Record<string, unknown> = {};
    if (scope.regionId) where.regionId = scope.regionId;
    if (scope.zoneId) where.zoneId = scope.zoneId;
    if (scope.districtId) where.districtId = scope.districtId;
    if (scope.institutionId) where.id = scope.institutionId;
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
    const where = scope.institutionId ? { institutionId: scope.institutionId } : scope.regionId ? { institution: { regionId: scope.regionId } } : scope.zoneId ? { institution: { zoneId: scope.zoneId } } : scope.districtId ? { institution: { districtId: scope.districtId } } : {};
    const [total, active, expired, suspended, revoked] = await Promise.all([
      this.prisma.license.count({ where }),
      this.prisma.license.count({ where: { ...where, status: 'ACTIVE' } }),
      this.prisma.license.count({ where: { ...where, status: 'EXPIRED' } }),
      this.prisma.license.count({ where: { ...where, status: 'SUSPENDED' } }),
      this.prisma.license.count({ where: { ...where, status: 'REVOKED' } }),
    ]);
    return { scope, total, active, expired, suspended, revoked };
  }
}
