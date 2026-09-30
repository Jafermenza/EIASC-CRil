import { Controller, Get, Header, Query, Req, UseGuards } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { ReportingService, ReportScope } from './reporting.service';
import { Roles } from '../auth/roles.decorator';
import { ReportingService } from './reporting.service';

const REPORT_ROLES = [RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.REGISTRAR, RoleCode.INSPECTOR, RoleCode.FINANCE_OFFICER, RoleCode.INSTITUTION_ADMIN];
type Query = { regionId?: string; zoneId?: string; subcityId?: string; districtId?: string; institutionId?: string; months?: string; from?: string; to?: string };

@Controller('reports')
@UseGuards(AuthGuard, RolesGuard)
export class ReportingController {
  constructor(private readonly reporting: ReportingService) {}

  @Get('dashboard')
  dashboard(@Req() req: AuthenticatedRequest, @Query() query: ReportScope) { return this.reporting.dashboard(req.user!, query); }
  @Get('members')
  members(@Req() req: AuthenticatedRequest, @Query() query: ReportScope) { return this.reporting.members(req.user!, query); }
  @Get('institutions')
  institutions(@Req() req: AuthenticatedRequest, @Query() query: ReportScope) { return this.reporting.institutions(req.user!, query); }
  @Get('registrations')
  registrations(@Req() req: AuthenticatedRequest, @Query() query: ReportScope) { return this.reporting.registrations(req.user!, query); }
  @Get('licenses')
  licenses(@Req() req: AuthenticatedRequest, @Query() query: ReportScope) { return this.reporting.licenses(req.user!, query); }
  @Roles(...REPORT_ROLES)
  dashboard(@Req() req: AuthenticatedRequest, @Query() query: Query) { return this.reporting.dashboard(req.user!, query, query); }
  @Get('trend')
  @Roles(...REPORT_ROLES)
  trend(@Req() req: AuthenticatedRequest, @Query() query: Query) { return this.reporting.trend(req.user!, query, Number(query.months || 12)); }
  @Get('regional')
  @Roles(...REPORT_ROLES)
  regional(@Req() req: AuthenticatedRequest, @Query() query: Query) { return this.reporting.regionalBreakdown(req.user!, query, query); }
  @Get('export')
  @Roles(...REPORT_ROLES)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="eiasc-report.csv"')
  export(@Req() req: AuthenticatedRequest, @Query() query: Query) { return this.reporting.exportCsv(req.user!, query, query); }
}
