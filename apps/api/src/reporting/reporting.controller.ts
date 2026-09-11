import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ReportingService } from './reporting.service';

@Controller('reports')
@UseGuards(AuthGuard, RolesGuard)
export class ReportingController {
  constructor(private readonly reporting: ReportingService) {}
  @Get('dashboard')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.REGISTRAR, RoleCode.INSPECTOR, RoleCode.FINANCE_OFFICER, RoleCode.INSTITUTION_ADMIN)
  dashboard(@Req() req: AuthenticatedRequest, @Query() query: { regionId?: string; zoneId?: string; districtId?: string; institutionId?: string }) { return this.reporting.dashboard(req.user!, query); }
}
