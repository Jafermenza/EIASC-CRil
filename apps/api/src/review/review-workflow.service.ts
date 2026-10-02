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
      const rows = await this.prisma.institutionApplication.findMany({ where, orderBy: { updatedAt: 'asc' }, take: 250 });
      for (const row of rows) if (await this.authorization.canAccess(user, row)) result.push({ type: 'INSTITUTION', id: row.id, trackingCode: row.trackingCode, status: row.status, name: row.institutionName, updatedAt: row.updatedAt, inspectionRequired: row.inspectionRequired, payment: await this.payments.getForApplication('INSTITUTION', row.id) });
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

  async setInspectionRequired(user: AuthenticatedUser, id: string, required: boolean) {
    this.assertRole(user, REVIEW_ROLES);
    const app = await this.prisma.institutionApplication.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('Application not found');
    await this.scope(user, app);
    const updated = await this.prisma.institutionApplication.update({ where: { id }, data: { inspectionRequired: required } });
    await this.audit(user, 'INSTITUTION', id, 'INSPECTION_REQUIREMENT_CHANGED', { required });
    return updated;
  }

  async assignInspection(user: AuthenticatedUser, id: string, inspectorUserId: string, scheduledAt?: string) {
    this.assertRole(user, REVIEW_ROLES);
    const app = await this.prisma.institutionApplication.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('Application not found');
    await this.scope(user, app);
    const inspector = await this.prisma.user.findUnique({ where: { id: inspectorUserId }, include: { roles: { include: { role: true } } } });
    if (!inspector || !inspector.roles.some(r => r.role.code === RoleCode.INSPECTOR)) throw new BadRequestException('Assigned user must have INSPECTOR role');
    const inspection = await this.prisma.inspection.create({ data: { institutionApplicationId: id, assignedToUserId: inspectorUserId, scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined } });
    await this.audit(user, 'INSTITUTION', id, 'INSPECTION_ASSIGNED', { inspectionId: inspection.id, inspectorUserId, scheduledAt });
    return inspection;
  }

  async inspectionDetail(user: AuthenticatedUser, id: string) {
    this.assertRole(user, INSPECTION_ROLES);
    const inspection = await this.prisma.inspection.findUnique({ where: { id }, include: { institutionApplication: true, registration: true, assignedTo: true } });
    if (!inspection) throw new NotFoundException('Inspection not found');
    if (user.roles.includes(RoleCode.INSPECTOR) && inspection.assignedToUserId !== user.id) throw new ForbiddenException('Inspection is not assigned to you');
    await this.scope(user, inspection.institutionApplication ?? inspection.registration ?? {});
    return inspection;
  }

  async updateInspection(user: AuthenticatedUser, id: string, input: { status?: InspectionStatus; findings?: unknown; decision?: InspectionDecision; decisionReason?: string }) {
    const inspection = await this.inspectionDetail(user, id);
    if (inspection.assignedToUserId !== user.id && user.roles.includes(RoleCode.INSPECTOR)) throw new ForbiddenException('Inspection is not assigned to you');
    const data: any = {};
    if (input.status) data.status = input.status;
    if (input.findings !== undefined) data.findings = input.findings;
    if (input.decision) data.decision = input.decision;
    if (input.decisionReason !== undefined) data.decisionReason = input.decisionReason;
    if (input.status === InspectionStatus.IN_PROGRESS && !inspection.startedAt) data.startedAt = new Date();
    if (input.status === InspectionStatus.COMPLETED) data.completedAt = new Date();
    if (input.status === InspectionStatus.COMPLETED && input.decision === InspectionDecision.PENDING) throw new BadRequestException('Completed inspection requires a decision');
    if (input.decision && input.decision !== InspectionDecision.PENDING && !input.decisionReason?.trim()) throw new BadRequestException('Decision reason is required');
    const updated = await this.prisma.inspection.update({ where: { id }, data });
    const entityType = inspection.institutionApplicationId ? 'InstitutionApplication' : 'Registration';
    const entityId = inspection.institutionApplicationId ?? inspection.registrationId!;
    await this.audit(user, inspection.institutionApplicationId ? 'INSTITUTION' : 'INDIVIDUAL', entityId, 'INSPECTION_UPDATED', { inspectionId: id, changes: input, decision: updated.decision, status: updated.status });
    return updated;
  }

  async audit(user: AuthenticatedUser, type: 'INDIVIDUAL'|'INSTITUTION', id: string, action: string, metadata?: unknown) {
    return this.prisma.auditLog.create({ data: { actorUserId: user.id, action, entityType: type === 'INDIVIDUAL' ? 'Registration' : 'InstitutionApplication', entityId: id, metadata: metadata as any } });
  }
}
