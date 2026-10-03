import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InspectionDecision, InspectionStatus, InstitutionApplicationStatus, RegistrationStatus, RoleCode } from '@prisma/client';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma.service';
import { RegistrationsService } from '../registrations/registrations.service';
import { InstitutionsService } from '../institutions/institutions.service';

const REVIEW_ROLES = [RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.REGISTRAR];
const INSPECTION_ROLES = [...REVIEW_ROLES, RoleCode.INSPECTOR];

@Injectable()
export class ReviewWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
    private readonly payments: PaymentsService,
    private readonly registrations: RegistrationsService,
    private readonly institutions: InstitutionsService,
  ) {}

  private assertRole(user: AuthenticatedUser, roles: RoleCode[]) {
    if (!user.roles.some((role) => roles.includes(role))) throw new ForbiddenException('Reviewer role is required');
  }

  private async scope(user: AuthenticatedUser, resource: { regionId?: string | null; zoneId?: string | null; subcityId?: string | null; districtId?: string | null }) {
    await this.authorization.assertCanAccess(user, resource);
  }

  async queue(user: AuthenticatedUser, query: { type?: 'INDIVIDUAL'|'INSTITUTION'; status?: string; search?: string }) {
    this.assertRole(user, REVIEW_ROLES);
    const individual = !query.type || query.type === 'INDIVIDUAL';
    const institution = !query.type || query.type === 'INSTITUTION';
    const result: any[] = [];
    if (individual) {
      const where: any = { status: { in: [RegistrationStatus.SUBMITTED, RegistrationStatus.UNDER_REVIEW, RegistrationStatus.RESUBMITTED, RegistrationStatus.CORRECTION] } };
      if (query.status) where.status = query.status;
      if (query.search?.trim()) where.OR = [{ trackingCode: { contains: query.search.trim(), mode: 'insensitive' } }, { firstName: { contains: query.search.trim(), mode: 'insensitive' } }, { lastName: { contains: query.search.trim(), mode: 'insensitive' } }];
      const rows = await this.prisma.registration.findMany({ where, orderBy: { updatedAt: 'asc' }, take: 250 });
      for (const row of rows) if (await this.authorization.canAccess(user, row)) result.push({ type: 'INDIVIDUAL', id: row.id, trackingCode: row.trackingCode, status: row.status, name: [row.firstName,row.middleName,row.lastName].filter(Boolean).join(' '), updatedAt: row.updatedAt, payment: await this.payments.getForApplication('INDIVIDUAL', row.id) });
    }
    if (institution) {
      const where: any = { status: { in: [InstitutionApplicationStatus.SUBMITTED, InstitutionApplicationStatus.UNDER_REVIEW, InstitutionApplicationStatus.RESUBMITTED, InstitutionApplicationStatus.CORRECTION_REQUIRED] } };
      if (query.status) where.status = query.status;
      if (query.search?.trim()) where.OR = [{ trackingCode: { contains: query.search.trim(), mode: 'insensitive' } }, { institutionName: { contains: query.search.trim(), mode: 'insensitive' } }];
      const rows = await this.prisma.institutionApplication.findMany({ where, include: { institutionType: true }, orderBy: { updatedAt: 'asc' }, take: 250 });
      for (const row of rows) if (await this.authorization.canAccess(user, row)) { const template = await this.activeChecklist(row.institutionTypeId); result.push({ type: 'INSTITUTION', id: row.id, trackingCode: row.trackingCode, status: row.status, name: row.institutionName, organizationType: row.institutionType.name, organizationTypeCode: row.institutionType.code, updatedAt: row.updatedAt, inspectionRequired: Boolean(template?.inspectionRequired), payment: await this.payments.getForApplication('INSTITUTION', row.id) }); }
    }
    return result.sort((a,b) => a.updatedAt.getTime() - b.updatedAt.getTime());
  }

  async detail(user: AuthenticatedUser, type: 'INDIVIDUAL'|'INSTITUTION', id: string) {
    this.assertRole(user, REVIEW_ROLES);
    if (type === 'INDIVIDUAL') {
      const app = await this.prisma.registration.findUnique({ where: { id }, include: { documents: true, amendments: { orderBy: { version: 'desc' } }, reviewSnapshots: { orderBy: { createdAt: 'desc' } }, correctionRequests: { orderBy: { createdAt: 'desc' } }, inspections: { orderBy: { createdAt: 'desc' } } } });
      if (!app) throw new NotFoundException('Application not found');
      await this.scope(user, app);
      return { type, application: app, payment: await this.payments.detailForReview('INDIVIDUAL', id), audits: await this.prisma.auditLog.findMany({ where: { entityType: 'Registration', entityId: id }, orderBy: { createdAt: 'desc' }, take: 100 }) };
    }
    const app = await this.prisma.institutionApplication.findUnique({ where: { id }, include: { institutionType: true, leaders: true, staffSummary: true, education: true, documents: true, amendments: { orderBy: { version: 'desc' } }, reviewSnapshots: { orderBy: { createdAt: 'desc' } }, correctionRequests: { orderBy: { createdAt: 'desc' } }, history: { orderBy: { createdAt: 'asc' } }, inspections: { orderBy: { createdAt: 'desc' } } } });
    if (!app) throw new NotFoundException('Application not found');
    await this.scope(user, app);
    return { type, application: app, payment: await this.payments.detailForReview('INSTITUTION', id), audits: await this.prisma.auditLog.findMany({ where: { entityType: 'InstitutionApplication', entityId: id }, orderBy: { createdAt: 'desc' }, take: 100 }) };
  }

  async snapshot(user: AuthenticatedUser, type: 'INDIVIDUAL'|'INSTITUTION', id: string) {
    this.assertRole(user, REVIEW_ROLES);
    const data = await this.detail(user, type, id);
    return this.prisma.applicationReviewSnapshot.create({ data: {
      registrationId: type === 'INDIVIDUAL' ? id : undefined,
      institutionApplicationId: type === 'INSTITUTION' ? id : undefined,
      capturedByUserId: user.id,
      status: data.application.status,
      snapshot: data.application as any,
    } }).then(async record => { await this.audit(user, type, id, 'APPLICATION_SNAPSHOT_CAPTURED', { snapshotId: record.id }); return record; });
  }

  async requestCorrection(user: AuthenticatedUser, type: 'INDIVIDUAL'|'INSTITUTION', id: string, reason: string, fields: Array<{ field: string; instruction: string }> = []) {
    this.assertRole(user, REVIEW_ROLES);
    if (!reason?.trim()) throw new BadRequestException('reason is required');
    const data = await this.detail(user, type, id);
    if (type === 'INDIVIDUAL') await this.registrations.requestApplicationCorrection(user, id, reason);
    else await this.institutions.requestCorrection(user, id, reason);
    const record = await this.prisma.applicationCorrection.create({ data: { registrationId: type === 'INDIVIDUAL' ? id : undefined, institutionApplicationId: type === 'INSTITUTION' ? id : undefined, requestedByUserId: user.id, reason: reason.trim(), fields } });
    await this.audit(user, type, id, 'APPLICATION_CORRECTION_BUILT', { correctionId: record.id, reason: reason.trim(), fields });
    return record;
  }


  private async activeChecklist(institutionTypeId: string) {
    return this.prisma.inspectionChecklistTemplate.findFirst({ where: { institutionTypeId, active: true }, orderBy: { version: 'desc' } });
  }

  private async matchingInspectorAssignment(inspectorUserId: string, app: { institutionTypeId: string; institutionId?: string | null; regionId: string; zoneId: string; subcityId?: string | null; districtId: string }) {
    const assignments = await this.prisma.inspectorAssignment.findMany({
      where: { inspectorUserId, active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }], AND: [{ OR: [{ institutionTypeId: null }, { institutionTypeId: app.institutionTypeId }] }] },
    });
    return assignments.find((a) => {
      if (a.jurisdictionLevel === 'NATIONAL') return true;
      if (!a.jurisdictionId) return false;
      if (a.jurisdictionLevel === 'REGION') return a.jurisdictionId === app.regionId;
      if (a.jurisdictionLevel === 'ZONE_CITY') return a.jurisdictionId === app.zoneId;
      if (a.jurisdictionLevel === 'SUBCITY_TOWN') return a.jurisdictionId === app.subcityId;
      if (a.jurisdictionLevel === 'DISTRICT') return a.jurisdictionId === app.districtId;
      if (a.jurisdictionLevel === 'INSTITUTION') return Boolean(app.institutionId && a.jurisdictionId === app.institutionId);
      return false;
    });
  }

  async createInspectorAssignment(user: AuthenticatedUser, input: { inspectorUserId: string; institutionTypeId?: string; jurisdictionLevel: string; jurisdictionId?: string; expiresAt?: string; notes?: string }) {
    this.assertRole(user, [RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN]);
    const inspector = await this.prisma.user.findUnique({ where: { id: input.inspectorUserId }, include: { roles: { include: { role: true } } } });
    if (!inspector || !inspector.roles.some((r) => r.role.code === RoleCode.INSPECTOR)) throw new BadRequestException('Assigned user must have INSPECTOR role');
    if (!['NATIONAL','REGION','ZONE_CITY','SUBCITY_TOWN','DISTRICT','INSTITUTION'].includes(input.jurisdictionLevel)) throw new BadRequestException('Invalid inspection jurisdiction level');
    if (input.institutionTypeId) {
      const type = await this.prisma.institutionType.findUnique({ where: { id: input.institutionTypeId }, select: { id: true, active: true } });
      if (!type?.active) throw new BadRequestException('Institution type is not active');
    }
    const assignment = await this.prisma.inspectorAssignment.create({ data: { inspectorUserId: input.inspectorUserId, institutionTypeId: input.institutionTypeId, jurisdictionLevel: input.jurisdictionLevel as any, jurisdictionId: input.jurisdictionId, expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined, notes: input.notes?.trim(), createdByUserId: user.id } });
    await this.audit(user, 'INSTITUTION', input.inspectorUserId, 'INSPECTOR_ASSIGNMENT_CREATED', { assignmentId: assignment.id, ...input });
    return assignment;
  }

  async listChecklistTemplates(user: AuthenticatedUser) {
    this.assertRole(user, [RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGISTRAR]);
    const types = await this.prisma.institutionType.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
    const rows = await this.prisma.inspectionChecklistTemplate.findMany({ where: { active: true }, include: { institutionType: true }, orderBy: { version: 'desc' } });
    const latest = new Map<string, typeof rows[number]>();
    for (const row of rows) if (!latest.has(row.institutionTypeId)) latest.set(row.institutionTypeId, row);
    return types.map((type) => latest.get(type.id) ?? {
      id: null,
      institutionTypeId: type.id,
      version: 0,
      name: '',
      description: null,
      inspectionRequired: false,
      items: [],
      active: false,
      institutionType: type,
    });
  }

  async saveChecklistTemplate(user: AuthenticatedUser, institutionTypeId: string, input: { name: string; description?: string; inspectionRequired: boolean; items: unknown[] }) {
    this.assertRole(user, [RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN]);
    if (!input.name?.trim()) throw new BadRequestException('Checklist name is required');
    if (!Array.isArray(input.items) || input.items.length < 1) throw new BadRequestException('Checklist must contain at least one item');
    for (const item of input.items as Array<Record<string, unknown>>) {
      if (typeof item.code !== 'string' || !item.code.trim() || typeof item.label !== 'string' || !item.label.trim() || typeof item.required !== 'boolean' || !['BOOLEAN','TEXT','NUMBER'].includes(String(item.type))) {
        throw new BadRequestException('Each checklist item requires code, label, required and type (BOOLEAN, TEXT or NUMBER)');
      }
    }
    const type = await this.prisma.institutionType.findUnique({ where: { id: institutionTypeId }, select: { id: true, active: true, name: true } });
    if (!type?.active) throw new BadRequestException('Institution type is not active');
    const latest = await this.prisma.inspectionChecklistTemplate.findFirst({ where: { institutionTypeId }, orderBy: { version: 'desc' } });
    const version = (latest?.version ?? 0) + 1;
    const record = await this.prisma.$transaction(async (tx) => {
      await tx.inspectionChecklistTemplate.updateMany({ where: { institutionTypeId, active: true }, data: { active: false } });
      return tx.inspectionChecklistTemplate.create({ data: { institutionTypeId, version, name: input.name.trim(), description: input.description?.trim(), inspectionRequired: Boolean(input.inspectionRequired), items: input.items, active: true } });
    });
    await this.audit(user, 'INSTITUTION', institutionTypeId, 'INSPECTION_CHECKLIST_UPDATED', { templateId: record.id, version, inspectionRequired: record.inspectionRequired, institutionType: type.name });
    return record;
  }

  async assignInspection(user: AuthenticatedUser, id: string, inspectorUserId: string, scheduledAt?: string) {
    this.assertRole(user, REVIEW_ROLES);
    const app = await this.prisma.institutionApplication.findUnique({ where: { id }, include: { institutionType: true } });
    if (!app) throw new NotFoundException('Application not found');
    await this.scope(user, app);
    if (app.status !== InstitutionApplicationStatus.UNDER_REVIEW) throw new ConflictException('Inspection can only be assigned after the application enters review');
    const template = await this.activeChecklist(app.institutionTypeId);
    if (!template) throw new ConflictException('No active inspection checklist exists for this organization type');
    if (!template.inspectionRequired) throw new ConflictException('Inspection is not required for this organization type');
    const inspector = await this.prisma.user.findUnique({ where: { id: inspectorUserId }, include: { roles: { include: { role: true } } } });
    if (!inspector || !inspector.roles.some(r => r.role.code === RoleCode.INSPECTOR)) throw new BadRequestException('Assigned user must have INSPECTOR role');
    const assignment = await this.matchingInspectorAssignment(inspectorUserId, app);
    if (!assignment) throw new ForbiddenException('Inspector is not assigned to this organization type and jurisdiction');
    const inspection = await this.prisma.inspection.create({ data: {
      institutionApplicationId: id, assignedToUserId: inspectorUserId, inspectorAssignmentId: assignment.id, institutionTypeId: app.institutionTypeId,
      checklistTemplateId: template.id, institutionTypeCode: app.institutionType.code, institutionTypeName: app.institutionType.name,
      checklistSnapshot: template.items, scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
    } });
    await this.audit(user, 'INSTITUTION', id, 'INSPECTION_ASSIGNED', { inspectionId: inspection.id, inspectorUserId, inspectorAssignmentId: assignment.id, checklistTemplateId: template.id, organizationType: app.institutionType.code, scheduledAt });
    return inspection;
  }

  async inspectionDetail(user: AuthenticatedUser, id: string) {
    this.assertRole(user, INSPECTION_ROLES);
    const inspection = await this.prisma.inspection.findUnique({ where: { id }, include: { institutionApplication: { include: { institutionType: true } }, registration: true, assignedTo: true, institutionType: true, checklistTemplate: true, inspectorAssignment: true } });
    if (!inspection) throw new NotFoundException('Inspection not found');
    if (user.roles.includes(RoleCode.INSPECTOR) && inspection.assignedToUserId !== user.id) throw new ForbiddenException('Inspection is not assigned to you');
    await this.scope(user, inspection.institutionApplication ?? inspection.registration ?? {});
    return inspection;
  }

  async updateInspection(user: AuthenticatedUser, id: string, input: { status?: InspectionStatus; findings?: unknown; decision?: InspectionDecision; decisionReason?: string; checklistResponses?: Array<{ code: string; value: unknown; note?: string }> }) {
    const inspection = await this.inspectionDetail(user, id);
    if (inspection.status === InspectionStatus.COMPLETED || inspection.status === InspectionStatus.CANCELLED) throw new ConflictException('Completed or cancelled inspections are immutable; create a new inspection for reassessment');
    if (inspection.assignedToUserId !== user.id && user.roles.includes(RoleCode.INSPECTOR)) throw new ForbiddenException('Inspection is not assigned to you');
    const data: any = {};
    if (input.status) data.status = input.status;
    if (input.findings !== undefined) data.findings = input.findings;
    if (input.decision) data.decision = input.decision;
    if (input.decisionReason !== undefined) data.decisionReason = input.decisionReason;
    if (input.status === InspectionStatus.IN_PROGRESS && !inspection.startedAt) data.startedAt = new Date();
    if (input.status === InspectionStatus.COMPLETED) data.completedAt = new Date();
    if (input.status === InspectionStatus.COMPLETED && (!input.decision || input.decision === InspectionDecision.PENDING)) throw new BadRequestException('Completed inspection requires a final decision');
    if (input.decision && input.decision !== InspectionDecision.PENDING && !input.decisionReason?.trim()) throw new BadRequestException('Decision reason is required');
    if (input.checklistResponses !== undefined) {
      const items = Array.isArray((inspection as any).checklistSnapshot) ? (inspection as any).checklistSnapshot : [];
      const responses = input.checklistResponses as Array<{ code: string; value: unknown; note?: string }>;
      const requiredCodes = items.filter((item: any) => item.required).map((item: any) => item.code);
      const supplied = new Set(responses.map((item) => item.code));
      if (input.status === InspectionStatus.COMPLETED) {
        for (const code of requiredCodes) if (!supplied.has(code)) throw new BadRequestException(`Checklist item ${code} must be completed`);
      }
      data.checklistResponses = responses;
      data.report = { organizationType: { code: (inspection as any).institutionTypeCode, name: (inspection as any).institutionTypeName }, checklistTemplateId: (inspection as any).checklistTemplateId, checklist: responses, findings: input.findings ?? (inspection as any).findings ?? null, decision: input.decision ?? (inspection as any).decision };
    }
    const entityType = inspection.institutionApplicationId ? 'InstitutionApplication' : 'Registration';
    const entityId = inspection.institutionApplicationId ?? inspection.registrationId!;
    await this.audit(user, inspection.institutionApplicationId ? 'INSTITUTION' : 'INDIVIDUAL', entityId, 'INSPECTION_UPDATED', { inspectionId: id, changes: input, decision: updated.decision, status: updated.status });
    return updated;
  }

  async inspectionReport(user: AuthenticatedUser, id: string) {
    const inspection = await this.inspectionDetail(user, id);
    return {
      inspectionId: inspection.id,
      organizationType: { id: inspection.institutionTypeId, code: inspection.institutionTypeCode, name: inspection.institutionTypeName },
      checklistTemplate: inspection.checklistTemplate ? { id: inspection.checklistTemplate.id, version: inspection.checklistTemplate.version, name: inspection.checklistTemplate.name } : null,
      checklistTemplateId: inspection.checklistTemplateId,
      checklist: inspection.checklistSnapshot,
      responses: inspection.checklistResponses,
      findings: inspection.findings,
      decision: inspection.decision,
      decisionReason: inspection.decisionReason,
      status: inspection.status,
      scheduledAt: inspection.scheduledAt,
      completedAt: inspection.completedAt,
    };
  }

  async audit(user: AuthenticatedUser, type: 'INDIVIDUAL'|'INSTITUTION', id: string, action: string, metadata?: unknown) {
    return this.prisma.auditLog.create({ data: { actorUserId: user.id, action, entityType: type === 'INDIVIDUAL' ? 'Registration' : 'InstitutionApplication', entityId: id, metadata: metadata as any } });
  }
}
