import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { InstitutionRelationshipType, MembershipStatus, RoleCode } from '@prisma/client';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MembershipService } from './membership.service';

const ADMIN_ROLES = [
  RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN,
  RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.REGISTRAR,
];

@Controller('memberships')
@UseGuards(AuthGuard, RolesGuard)
export class MembershipController {
  constructor(private readonly memberships: MembershipService) {}

  @Get('institution/:institutionId')
  @Roles(...ADMIN_ROLES, RoleCode.INSTITUTION_ADMIN)
  list(@Req() req: AuthenticatedRequest, @Param('institutionId') institutionId: string) {
    return this.memberships.list(req.user!, institutionId);
  }

  @Post()
  @Roles(...ADMIN_ROLES)
  request(
    @Req() req: AuthenticatedRequest,
    @Body() body: { memberId?: string; institutionId?: string; relationshipType?: InstitutionRelationshipType },
  ) {
    return this.memberships.request(req.user!, body);
  }

  @Post('direct')
  @Roles(RoleCode.INSTITUTION_ADMIN)
  directAdd(
    @Req() req: AuthenticatedRequest,
    @Body() body: { memberId?: string; institutionId?: string; relationshipType?: InstitutionRelationshipType; reason?: string },
  ) {
    return this.memberships.directAdd(req.user!, body);
  }

  @Patch(':id/status')
  @Roles(...ADMIN_ROLES)
  status(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { status?: MembershipStatus; reason?: string },
  ) {
    if (!body?.status) throw new BadRequestException('status is required');
    return this.memberships.setStatus(req.user!, id, body.status, body.reason);
  }
}
