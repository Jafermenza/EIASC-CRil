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

  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGISTRAR)
  @Get('checklists')
  checklists(@Req() req: AuthenticatedRequest) { return this.workflow.listChecklistTemplates(req.user!); }

  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN)
  @Put('checklists/institution-type/:institutionTypeId')
  saveChecklist(@Req() req: AuthenticatedRequest, @Param('institutionTypeId') institutionTypeId: string, @Body() body: { name?: string; description?: string; inspectionRequired?: boolean; items?: unknown[] }) {
    return this.workflow.saveChecklistTemplate(req.user!, institutionTypeId, { name: body?.name ?? '', description: body?.description, inspectionRequired: Boolean(body?.inspectionRequired), items: body?.items ?? [] });
  }

  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN)
  @Post('inspector-assignments')
  createInspectorAssignment(@Req() req: AuthenticatedRequest, @Body() body: { inspectorUserId?: string; institutionTypeId?: string; jurisdictionLevel?: string; jurisdictionId?: string; expiresAt?: string; notes?: string }) {
    return this.workflow.createInspectorAssignment(req.user!, { inspectorUserId: body?.inspectorUserId ?? '', institutionTypeId: body?.institutionTypeId, jurisdictionLevel: body?.jurisdictionLevel ?? '', jurisdictionId: body?.jurisdictionId, expiresAt: body?.expiresAt, notes: body?.notes });
  }

  @Roles(...REVIEW_ROLES)
  @Post('institution/:id/inspections')
  assign(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: { inspectorUserId?: string; scheduledAt?: string }) { return this.workflow.assignInspection(req.user!, id, body?.inspectorUserId ?? '', body?.scheduledAt); }

  @Roles(...INSPECTION_ROLES)
  @Get('inspections/:id')
  inspection(@Req() req: AuthenticatedRequest, @Param('id') id: string) { return this.workflow.inspectionDetail(req.user!, id); }

  @Roles(...INSPECTION_ROLES)
  @Get('inspections/:id/report')
  report(@Req() req: AuthenticatedRequest, @Param('id') id: string) { return this.workflow.inspectionReport(req.user!, id); }

  @Roles(...INSPECTION_ROLES)
  @Put('inspections/:id')
  updateInspection(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: { status?: InspectionStatus; findings?: unknown; decision?: InspectionDecision; decisionReason?: string; checklistResponses?: Array<{ code: string; value: unknown; note?: string }> }) { return this.workflow.updateInspection(req.user!, id, body); }
}
