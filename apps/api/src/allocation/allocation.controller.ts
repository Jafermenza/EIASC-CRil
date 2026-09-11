import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { AllocationService } from './allocation.service';

@Controller('allocations')
@UseGuards(AuthGuard)
export class AllocationController {
  constructor(private readonly allocation: AllocationService) {}

  @Post('policies')
  createPolicy(@Req() req: AuthenticatedRequest, @Body() body: { name: string; version: string; effectiveFrom: string; eligibilityRules: object; formulaDefinition: object }) { return this.allocation.createPolicy(req.user!, body); }
  @Patch('policies/:id/approve')
  approvePolicy(@Req() req: AuthenticatedRequest, @Param('id') id: string) { return this.allocation.approvePolicy(req.user!, id); }
  @Post('runs/preview')
  preview(@Req() req: AuthenticatedRequest, @Body() body: { policyId: string; period: string; fundingPool: number }) { return this.allocation.preview(req.user!, body); }
  @Patch('runs/:id/review')
  review(@Req() req: AuthenticatedRequest, @Param('id') id: string) { return this.allocation.review(req.user!, id); }
  @Patch('runs/:id/finalize')
  finalize(@Req() req: AuthenticatedRequest, @Param('id') id: string) { return this.allocation.finalize(req.user!, id); }
  @Get('runs/:id')
  get(@Req() req: AuthenticatedRequest, @Param('id') id: string) { return this.allocation.get(req.user!, id); }
}
