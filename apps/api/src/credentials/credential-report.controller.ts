import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CredentialReportService } from './credential-report.service';

@Controller('credentials/reports')
@UseGuards(AuthGuard, RolesGuard)
@Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN)
export class CredentialReportController {
  constructor(private readonly reports: CredentialReportService) {}
  @Get()
  report(@Req() req: AuthenticatedRequest, @Query('from') from?: string, @Query('to') to?: string) { return this.reports.report(req.user!, from, to); }
}
