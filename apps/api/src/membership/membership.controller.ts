import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { MembershipStatus, RoleCode } from '@prisma/client';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MembershipService } from './membership.service';

@Controller('memberships')
@UseGuards(AuthGuard, RolesGuard)
export class MembershipController {
  constructor(private readonly memberships: MembershipService) {}
  @Get('institution/:institutionId')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.REGISTRAR, RoleCode.INSTITUTION_ADMIN)
  list(@Req() req: AuthenticatedRequest, @Param('institutionId') institutionId: string) { return this.memberships.list(req.user!, institutionId); }
  @Post()
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.REGISTRAR, RoleCode.INSTITUTION_ADMIN)
  request(@Req() req: AuthenticatedRequest, @Body() body: { memberId?: string; institutionId?: string; membershipType?: string; isPrimary?: boolean }) { return this.memberships.request(req.user!, body); }
  @Patch(':id/status')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.REGISTRAR)
  status(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: { status?: MembershipStatus }) {
    if (!body?.status) throw new BadRequestException('status is required');
    return this.memberships.setStatus(req.user!, id, body.status);
  }
}
