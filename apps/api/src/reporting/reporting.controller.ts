import { Controller, Get, Header, Query, Req, UseGuards } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ReportingService } from './reporting.service';

const REPORT_ROLES = [RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.REGISTRAR, RoleCode.INSPECTOR, RoleCode.FINANCE_OFFICER, RoleCode.INSTITUTION_ADMIN];

@Controller('reports')
@UseGuards(AuthGuard, RolesGuard)
export class ReportingController {
  constructor(private readonly reporting: ReportingService) {}
  @Get('dashboard')
  @Roles(...REPORT_ROLES)
  dashboard(@Req() req: AuthenticatedRequest, @Query() query: { regionId?: string; zoneId?: string; subcityId?: string; districtId?: string; institutionId?: string }) { return this.reporting.dashboard(req.user!, query); }
  @Get('trend')
  @Roles(...REPORT_ROLES)
  trend(@Req() req: AuthenticatedRequest, @Query() query: { regionId?: string; zoneId?: string; subcityId?: string; districtId?: string; institutionId?: string; months?: string }) { return this.reporting.trend(req.user!, query, Number(query.months || 12)); }
  @Get('export')
  @Roles(...REPORT_ROLES)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="eiasc-report.csv"')
  export(@Req() req: AuthenticatedRequest, @Query() query: { regionId?: string; zoneId?: string; subcityId?: string; districtId?: string; institutionId?: string }) { return this.reporting.exportCsv(req.user!, query); }
}
