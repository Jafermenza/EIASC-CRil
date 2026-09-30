import { Body, Controller, Get, Param, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { Response } from 'express';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AllocationService } from './allocation.service';

@Controller('allocations')
@UseGuards(AuthGuard, RolesGuard)
export class AllocationController {
  constructor(private readonly allocation: AllocationService) {}

  @Post('policies')
  createPolicy(@Req() req: AuthenticatedRequest, @Body() body: { name: string; version: string; effectiveFrom: string; eligibilityRules: object; formulaDefinition: object }) { return this.allocation.createPolicy(req.user!, body); }
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.FINANCE_OFFICER)
  createPolicy(@Req() req: AuthenticatedRequest, @Body() body: { name?: string; version?: string; effectiveFrom?: string; eligibilityRules?: object; formulaDefinition?: object }) {
    return this.allocation.createPolicy(req.user!, {
      name: body.name ?? '',
      version: body.version ?? '',
      effectiveFrom: body.effectiveFrom,
      eligibilityRules: body.eligibilityRules,
      formulaDefinition: body.formulaDefinition ?? {},
    });
  }

  @Patch('policies/:id/approve')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.FINANCE_OFFICER)
  approvePolicy(@Req() req: AuthenticatedRequest, @Param('id') id: string) { return this.allocation.approvePolicy(req.user!, id); }

  @Post('runs/preview')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.FINANCE_OFFICER)
  preview(@Req() req: AuthenticatedRequest, @Body() body: { policyId: string; period: string; fundingPool: number }) { return this.allocation.preview(req.user!, body); }

  @Patch('runs/:id/review')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.FINANCE_OFFICER)
  review(@Req() req: AuthenticatedRequest, @Param('id') id: string) { return this.allocation.review(req.user!, id); }

  @Patch('runs/:id/finalize')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.FINANCE_OFFICER)
  finalize(@Req() req: AuthenticatedRequest, @Param('id') id: string) { return this.allocation.finalize(req.user!, id); }

  @Get('runs')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.FINANCE_OFFICER)
  list(@Req() req: AuthenticatedRequest) { return this.allocation.list(req.user!); }

  @Get('runs/:id/export')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.FINANCE_OFFICER)
  async export(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Res() response: Response) {
    const result = await this.allocation.export(req.user!, id);
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    return response.send(result.csv);
  }

  @Get('runs/:id')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.FINANCE_OFFICER)
  get(@Req() req: AuthenticatedRequest, @Param('id') id: string) { return this.allocation.get(req.user!, id); }
}
