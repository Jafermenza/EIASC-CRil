import { ForbiddenException, Injectable } from '@nestjs/common';
import { JurisdictionLevel, RoleCode } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AuthenticatedUser } from './auth.types';

export interface ResourceScope {
  regionId?: string | null;
  zoneId?: string | null;
  subcityId?: string | null;
  districtId?: string | null;
  institutionId?: string | null;
}

@Injectable()
export class AuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  assertAnyRole(user: AuthenticatedUser, roles: RoleCode[]): void {
    if (!roles.some((role) => user.roles.includes(role))) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }
  }

  async canAccess(user: AuthenticatedUser, resource: ResourceScope): Promise<boolean> {
    if (user.roles.includes(RoleCode.SUPER_ADMIN) || user.roles.includes(RoleCode.NATIONAL_ADMIN)) return true;

    let scope = resource;
    if (scope.institutionId && !scope.regionId) {
      const institution = await this.prisma.institution.findUnique({ where: { id: scope.institutionId } });
      if (!institution) return false;
      scope = { ...scope, regionId: institution.regionId, zoneId: institution.zoneId, subcityId: institution.subcityId, districtId: institution.districtId };
    } else if (scope.districtId && (!scope.regionId || !scope.zoneId)) {
      const district = await this.prisma.district.findUnique({ where: { id: scope.districtId }, select: { id: true, zoneId: true, subcityId: true } });
      if (!district) return false;
      const zone = await this.prisma.zoneCity.findUnique({ where: { id: district.zoneId }, select: { id: true, regionId: true } });
      if (!zone) return false;
      scope = { ...scope, regionId: zone.regionId, zoneId: zone.id, subcityId: district.subcityId, districtId: district.id };
    } else if (scope.subcityId && (!scope.regionId || !scope.zoneId)) {
      const subcity = await this.prisma.subcityTown.findUnique({ where: { id: scope.subcityId }, select: { id: true, zoneId: true } });
      if (!subcity) return false;
      const zone = await this.prisma.zoneCity.findUnique({ where: { id: subcity.zoneId }, select: { id: true, regionId: true } });
      if (!zone) return false;
      scope = { ...scope, regionId: zone.regionId, zoneId: zone.id, subcityId: subcity.id };
    } else if (scope.zoneId && !scope.regionId) {
      const zone = await this.prisma.zoneCity.findUnique({ where: { id: scope.zoneId }, select: { id: true, regionId: true } });
      if (!zone) return false;
      scope = { ...scope, regionId: zone.regionId, zoneId: zone.id };
    }

    if (!user.jurisdictionId) return false;
    switch (user.jurisdictionLevel) {
      case JurisdictionLevel.REGION:
        return scope.regionId === user.jurisdictionId;
      case JurisdictionLevel.ZONE_CITY:
        return scope.zoneId === user.jurisdictionId;
      case JurisdictionLevel.SUBCITY_TOWN:
        return scope.subcityId === user.jurisdictionId;
      case JurisdictionLevel.DISTRICT:
        return scope.districtId === user.jurisdictionId;
      case JurisdictionLevel.INSTITUTION:
        return scope.institutionId === user.institutionId || scope.institutionId === user.jurisdictionId;
      case JurisdictionLevel.NATIONAL:
        return true;
      default:
        return false;
    }
  }

  async assertCanAccess(user: AuthenticatedUser, resource: ResourceScope): Promise<void> {
    if (!(await this.canAccess(user, resource))) throw new ForbiddenException('Resource is outside your jurisdiction');
  }
}
