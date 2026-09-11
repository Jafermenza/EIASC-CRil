import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { ReportingService } from './reporting.service';

@Controller('reports')
@UseGuards(AuthGuard, RolesGuard)
export class ReportingController {
  constructor(private readonly reporting: ReportingService) {}
  @Get('dashboard')
  dashboard(@Req() req: AuthenticatedRequest, @Query() query: { regionId?: string; zoneId?: string; districtId?: string; institutionId?: string }) { return this.reporting.dashboard(req.user!, query); }
}
