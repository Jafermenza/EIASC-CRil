import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { ReportingService, ReportScope } from './reporting.service';

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
}
