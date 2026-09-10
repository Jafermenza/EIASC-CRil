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

  async canAccess(user: AuthenticatedUser, resource: ResourceScope): Promise<boolean> {
    if (user.roles.includes(RoleCode.SUPER_ADMIN) || user.roles.includes(RoleCode.NATIONAL_ADMIN)) return true;

    let scope = resource;
    if (scope.institutionId && !scope.regionId) {
      const institution = await this.prisma.institution.findUnique({ where: { id: scope.institutionId } });
      if (!institution) return false;
      scope = { ...scope, regionId: institution.regionId, zoneId: institution.zoneId, subcityId: institution.subcityId, districtId: institution.districtId };
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
