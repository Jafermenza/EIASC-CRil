import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateLicenseInput, LicenseListQuery, LicenseReasonInput, RenewLicenseInput } from './license.types';
import { LicensingService } from './licensing.service';

const VIEW_ROLES = [
  RoleCode.SUPER_ADMIN,
  RoleCode.NATIONAL_ADMIN,
  RoleCode.REGIONAL_ADMIN,
  RoleCode.ZONE_ADMIN,
  RoleCode.DISTRICT_ADMIN,
  RoleCode.REGISTRAR,
  RoleCode.INSPECTOR,
  RoleCode.INSTITUTION_ADMIN,
];

const DECISION_ROLES = [
  RoleCode.SUPER_ADMIN,
  RoleCode.NATIONAL_ADMIN,
  RoleCode.REGIONAL_ADMIN,
  RoleCode.ZONE_ADMIN,
  RoleCode.DISTRICT_ADMIN,
  RoleCode.REGISTRAR,
  RoleCode.INSPECTOR,
];

@Controller('licenses')
@UseGuards(AuthGuard, RolesGuard)
export class LicensingController {
  constructor(private readonly licensing: LicensingService) {}

  @Roles(...VIEW_ROLES)
  @Get()
  list(@Req() req: AuthenticatedRequest, @Query() query: LicenseListQuery) {
    return this.licensing.list(req.user!, query);
  }

  @Roles(...VIEW_ROLES)
  @Get(':id')
  get(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.licensing.get(req.user!, id);
  }

  @Roles(...DECISION_ROLES)
  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() body: CreateLicenseInput) {
    if (!body?.institutionId?.trim()) throw new BadRequestException('institutionId is required');
    return this.licensing.create(req.user!, body);
  }

  @Roles(...DECISION_ROLES)
  @Post(':id/review')
  review(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.licensing.review(req.user!, id);
  }

  @Roles(...DECISION_ROLES)
  @Post(':id/request-correction')
  requestCorrection(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: LicenseReasonInput) {
    if (!body?.reason?.trim()) throw new BadRequestException('reason is required');
    return this.licensing.requestCorrection(req.user!, id, body.reason);
  }

  @Roles(...DECISION_ROLES)
  @Post(':id/approve')
  approve(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.licensing.approve(req.user!, id);
  }

  @Roles(...DECISION_ROLES)
  @Post(':id/issue')
  issue(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: RenewLicenseInput = {}) {
    return this.licensing.issue(req.user!, id, body.expiresAt);
  }

  @Roles(...DECISION_ROLES)
  @Post(':id/suspend')
  suspend(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: LicenseReasonInput) {
    if (!body?.reason?.trim()) throw new BadRequestException('reason is required');
    return this.licensing.suspend(req.user!, id, body.reason);
  }

  @Roles(...DECISION_ROLES)
  @Post(':id/restore')
  restore(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.licensing.restore(req.user!, id);
  }

  @Roles(...DECISION_ROLES)
  @Post(':id/revoke')
  revoke(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: LicenseReasonInput) {
    if (!body?.reason?.trim()) throw new BadRequestException('reason is required');
    return this.licensing.revoke(req.user!, id, body.reason);
  }

  @Roles(...DECISION_ROLES)
  @Post(':id/renew')
  renew(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: RenewLicenseInput) {
    if (!body?.expiresAt?.trim()) throw new BadRequestException('expiresAt is required');
    return this.licensing.renew(req.user!, id, body.expiresAt);
  }
}
