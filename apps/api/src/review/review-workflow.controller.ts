import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { InspectionDecision, InspectionStatus, RoleCode } from '@prisma/client';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ReviewWorkflowService } from './review-workflow.service';

const REVIEW_ROLES = [RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.REGISTRAR];
const INSPECTION_ROLES = [...REVIEW_ROLES, RoleCode.INSPECTOR];

@Controller('admin/review')
@UseGuards(AuthGuard, RolesGuard)
export class ReviewWorkflowController {
  constructor(private readonly workflow: ReviewWorkflowService) {}

  @Roles(...REVIEW_ROLES)
  @Get('workspace')
  queue(@Req() req: AuthenticatedRequest, @Query() query: { type?: 'INDIVIDUAL'|'INSTITUTION'; status?: string; search?: string }) { return this.workflow.queue(req.user!, query); }

  @Roles(...REVIEW_ROLES)
  @Get(':type/:id')
  detail(@Req() req: AuthenticatedRequest, @Param('type') type: 'INDIVIDUAL'|'INSTITUTION', @Param('id') id: string) { return this.workflow.detail(req.user!, type, id); }

  @Roles(...REVIEW_ROLES)
  @Post(':type/:id/snapshot')
  snapshot(@Req() req: AuthenticatedRequest, @Param('type') type: 'INDIVIDUAL'|'INSTITUTION', @Param('id') id: string) { return this.workflow.snapshot(req.user!, type, id); }

  @Roles(...REVIEW_ROLES)
  @Post(':type/:id/correction')
  correction(@Req() req: AuthenticatedRequest, @Param('type') type: 'INDIVIDUAL'|'INSTITUTION', @Param('id') id: string, @Body() body: { reason?: string; fields?: Array<{ field: string; instruction: string }> }) { return this.workflow.requestCorrection(req.user!, type, id, body?.reason ?? '', body?.fields ?? []); }

  @Roles(...REVIEW_ROLES)
  @Put('institution/:id/inspection-required')
  inspectionRequired(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: { required?: boolean }) { return this.workflow.setInspectionRequired(req.user!, id, Boolean(body?.required)); }

  @Roles(...REVIEW_ROLES)
  @Post('institution/:id/inspections')
  assign(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: { inspectorUserId?: string; scheduledAt?: string }) { return this.workflow.assignInspection(req.user!, id, body?.inspectorUserId ?? '', body?.scheduledAt); }

  @Roles(...INSPECTION_ROLES)
  @Get('inspections/:id')
  inspection(@Req() req: AuthenticatedRequest, @Param('id') id: string) { return this.workflow.inspectionDetail(req.user!, id); }

  @Roles(...INSPECTION_ROLES)
  @Put('inspections/:id')
  updateInspection(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: { status?: InspectionStatus; findings?: unknown; decision?: InspectionDecision; decisionReason?: string }) { return this.workflow.updateInspection(req.user!, id, body); }
}
