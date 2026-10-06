import { Controller, Get, Header, Query, Req, UseGuards } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ReportingService } from './reporting.service';

const REPORT_ROLES = [RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.REGISTRAR, RoleCode.INSPECTOR, RoleCode.FINANCE_OFFICER, RoleCode.INSTITUTION_ADMIN];
type Query = { regionId?: string; zoneId?: string; subcityId?: string; districtId?: string; institutionId?: string; months?: string; from?: string; to?: string };

@Controller('reports')
@UseGuards(AuthGuard, RolesGuard)
export class ReportingController {
  constructor(private readonly reporting: ReportingService) {}
  @Get('dashboard')
  @Roles(...REPORT_ROLES)
  dashboard(@Req() req: AuthenticatedRequest, @Query() query: Query) { return this.reporting.dashboard(req.user!, query, query); }
  @Get('trend')
  @Roles(...REPORT_ROLES)
  trend(@Req() req: AuthenticatedRequest, @Query() query: Query) { return this.reporting.trend(req.user!, query, Number(query.months || 12)); }
  @Get('regional')
  @Roles(...REPORT_ROLES)
  regional(@Req() req: AuthenticatedRequest, @Query() query: Query) { return this.reporting.regionalBreakdown(req.user!, query, query); }
  @Get('queue-sla')
  @Roles(...REPORT_ROLES)
  queueSla(@Req() req: AuthenticatedRequest, @Query() query: Query & { slaHours?: string }) { return this.reporting.queueSla(req.user!, query, Number(query.slaHours || 48)); }

  @Get('throughput')
  @Roles(...REPORT_ROLES)
  throughput(@Req() req: AuthenticatedRequest, @Query() query: Query) { return this.reporting.applicationThroughput(req.user!, query, query); }

  @Get('reviewer-workload')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.REGISTRAR)
  reviewerWorkload(@Req() req: AuthenticatedRequest, @Query() query: Query) { return this.reporting.reviewerWorkload(req.user!, query, query); }

  @Get('payment-reconciliation')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.REGISTRAR, RoleCode.FINANCE_OFFICER)
  paymentReconciliation(@Req() req: AuthenticatedRequest, @Query() query: Query) { return this.reporting.paymentReconciliation(req.user!, query, query); }

  @Get('audit-export')
  @Roles(RoleCode.SUPER_ADMIN)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="eiasc-audit-export.csv"')
  auditExport(@Req() req: AuthenticatedRequest, @Query() query: { action?: string; entityType?: string; from?: string; to?: string }) { return this.reporting.auditExport(req.user!, query); }

  @Get('export')
  @Roles(...REPORT_ROLES)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="eiasc-report.csv"')
  export(@Req() req: AuthenticatedRequest, @Query() query: Query) { return this.reporting.exportCsv(req.user!, query, query); }
}
