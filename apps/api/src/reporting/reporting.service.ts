import { Injectable } from '@nestjs/common';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ReportingService {
  constructor(private readonly prisma: PrismaService, private readonly authorization: AuthorizationService) {}

  async dashboard(user: AuthenticatedUser, scope: { regionId?: string; zoneId?: string; districtId?: string; institutionId?: string }) {
    if (scope.institutionId) await this.authorization.assertCanAccess(user, { institutionId: scope.institutionId });
    const memberWhere: Record<string, unknown> = {};
    const institutionWhere: Record<string, unknown> = {};
    const applicationWhere: Record<string, unknown> = {};
    if (scope.regionId) { memberWhere.regionId = scope.regionId; institutionWhere.regionId = scope.regionId; }
    if (scope.zoneId) { memberWhere.zoneId = scope.zoneId; institutionWhere.zoneId = scope.zoneId; }
    if (scope.districtId) { memberWhere.districtId = scope.districtId; institutionWhere.districtId = scope.districtId; }
    if (scope.institutionId) institutionWhere.id = scope.institutionId;
    if (scope.regionId) applicationWhere.regionId = scope.regionId;
    if (scope.zoneId) applicationWhere.zoneId = scope.zoneId;
    if (scope.districtId) applicationWhere.districtId = scope.districtId;
    if (scope.institutionId) applicationWhere.institutionId = scope.institutionId;
    const [members, activeMembers, institutions, activeInstitutions, pendingApplications, approvedApplications, rejectedApplications, activeLicenses, expiredLicenses, suspendedLicenses] = await Promise.all([
      this.prisma.member.count({ where: memberWhere }), this.prisma.member.count({ where: { ...memberWhere, status: 'ACTIVE' } }),
      this.prisma.institution.count({ where: institutionWhere }), this.prisma.institution.count({ where: { ...institutionWhere, status: 'ACTIVE' } }),
      this.prisma.institutionApplication.count({ where: { ...applicationWhere, status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'CORRECTION_REQUIRED', 'RESUBMITTED'] } } }),
      this.prisma.institutionApplication.count({ where: { ...applicationWhere, status: 'APPROVED' } }), this.prisma.institutionApplication.count({ where: { ...applicationWhere, status: 'REJECTED' } }),
      this.prisma.license.count({ where: { institution: institutionWhere, status: 'ACTIVE' } }), this.prisma.license.count({ where: { institution: institutionWhere, status: 'EXPIRED' } }), this.prisma.license.count({ where: { institution: institutionWhere, status: 'SUSPENDED' } }),
    ]);
    return { members, activeMembers, institutions, activeInstitutions, pendingApplications, approvedApplications, rejectedApplications, activeLicenses, expiredLicenses, suspendedLicenses };
  }
}
