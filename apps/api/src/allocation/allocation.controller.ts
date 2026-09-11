import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AllocationService } from './allocation.service';

@Controller('allocations')
@UseGuards(AuthGuard, RolesGuard)
export class AllocationController {
  constructor(private readonly allocation: AllocationService) {}
  @Post('policies')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.FINANCE_OFFICER)
  createPolicy(@Req() req: AuthenticatedRequest, @Body() body: { name?: string; version?: string; effectiveFrom?: string; eligibilityRules?: object; formulaDefinition?: object }) { return this.allocation.createPolicy(req.user!, body as { name: string; version: string; effectiveFrom: string; eligibilityRules: object; formulaDefinition: object }); }
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
  @Get('runs/:id')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.FINANCE_OFFICER)
  get(@Param('id') id: string) { return this.allocation.get(id); }
}
