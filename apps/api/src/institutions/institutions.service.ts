import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InstitutionApplicationStatus, InstitutionRelationshipType, InstitutionStatus, MembershipStatus, RoleCode } from '@prisma/client';
import { createOpaqueToken } from '../auth/crypto';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { CredentialProvisioningService } from '../auth/credential-provisioning.service';
import { LocationsService } from '../locations/locations.service';
import { PrismaService } from '../prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { DOCUMENT_TYPES, EDUCATION_LEVELS, InstitutionApplicationInput, InstitutionApplicationUpdateInput, InstitutionListQuery, InstitutionProfileUpdateInput, MemberRelationshipInput } from './institution.types';
import { MembershipService } from '../membership/membership.service';

const ACTIVE_APP: InstitutionApplicationStatus[] = [InstitutionApplicationStatus.DRAFT, InstitutionApplicationStatus.SUBMITTED, InstitutionApplicationStatus.UNDER_REVIEW, InstitutionApplicationStatus.CORRECTION_REQUIRED, InstitutionApplicationStatus.RESUBMITTED];
const ADMIN_ROLES: RoleCode[] = [RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN];
const MAX_TEXT = 5000;

@Injectable()
export class InstitutionsService {
  constructor(private readonly prisma: PrismaService, private readonly locations: LocationsService, private readonly authorization: AuthorizationService, private readonly credentials: CredentialProvisioningService, private readonly payments: PaymentsService, private readonly memberships: MembershipService) {}

  private clean(value?: string, max = MAX_TEXT): string | undefined {
    const v = value?.trim();
    if (!v) return undefined;
    if (v.length > max) throw new BadRequestException('Text field exceeds maximum length');
    if (/<\/?[a-z][\s\S]*>/i.test(v)) throw new BadRequestException('HTML is not allowed');
    return v;
  }

  private require(value: unknown, name: string): string {
    const v = this.clean(String(value ?? ''));
    if (!v) throw new BadRequestException(`${name} is required`);
    return v;
  }

  private async trackingCode(): Promise<string> {
    const year = new Date().getUTCFullYear();
    for (let i = 0; i < 10; i += 1) {
      const suffix = createOpaqueToken(6).replace(/[-_]/g, '').slice(0, 6).toUpperCase();
      const code = `EIASC-I-${year}-${suffix}`;
      if (!(await this.prisma.institutionApplication.findUnique({ where: { trackingCode: code }, select: { id: true } }))) return code;
    }
    throw new ConflictException('Unable to allocate a unique institution tracking code');
  }

  private institutionCode(): string {
    const year = new Date().getUTCFullYear();
    return `EIASC-INST-${year}-${createOpaqueToken(6).replace(/[-_]/g, '').slice(0, 8).toUpperCase()}`;
  }

  private async validateInput(input: InstitutionApplicationInput | InstitutionApplicationUpdateInput, requireCore = true) {
    if (!input || typeof input !== 'object') throw new BadRequestException('Application payload is required');
    if (requireCore) {
      this.require(input.institutionName, 'institutionName'); this.require(input.institutionTypeId, 'institutionTypeId'); this.require(input.establishmentDate, 'establishmentDate'); this.require(input.phone, 'phone'); this.require(input.email, 'email'); this.require(input.regionId, 'regionId'); this.require(input.zoneId, 'zoneId'); this.require(input.address, 'address');
      if (!Array.isArray(input.leaders) || input.leaders.length < 1) throw new BadRequestException('At least one institutional leader is required');
    }
    if (input.email && !/^\S+@\S+\.\S+$/.test(input.email.trim())) throw new BadRequestException('Invalid email');
    if (input.website && !/^https?:\/\//i.test(input.website.trim())) throw new BadRequestException('website must be an http(s) URL');
    if (input.establishmentDate) { const d = new Date(input.establishmentDate); if (Number.isNaN(d.getTime()) || d > new Date()) throw new BadRequestException('Invalid establishmentDate'); }
    if (input.regionId && input.zoneId) await this.locations.validateHierarchy({ regionId: input.regionId, zoneId: input.zoneId, subcityId: input.subcityId, districtId: input.districtId });
    if (input.institutionTypeId) { const type = await this.prisma.institutionType.findUnique({ where: { id: input.institutionTypeId }, select: { id: true, active: true } }); if (!type || !type.active) throw new BadRequestException('Institution type is not active'); }
    for (const leader of input.leaders ?? []) { this.require(leader.fullName, 'leader.fullName'); this.require(leader.role, 'leader.role'); this.require(leader.phone, 'leader.phone'); if (leader.email && !/^\S+@\S+\.\S+$/.test(leader.email.trim())) throw new BadRequestException('Invalid leader email'); }
    for (const field of ['imamCount', 'teacherCount', 'administrativeStaffCount', 'otherStaffCount'] as const) { const value = input.staff?.[field]; if (value !== undefined && (!Number.isInteger(value) || value < 0)) throw new BadRequestException(`${field} must be a non-negative integer`); }
    if (input.education) { for (const field of ['studentCount', 'teacherCount'] as const) { const value = input.education[field]; if (value !== undefined && (!Number.isInteger(value) || value < 0)) throw new BadRequestException(`${field} must be a non-negative integer`); } if (input.education.educationLevels && input.education.educationLevels.some((x) => !EDUCATION_LEVELS.includes(x as any))) throw new BadRequestException('Invalid education level'); }
    for (const d of input.documents ?? []) { if (!DOCUMENT_TYPES.includes(d.documentType as any)) throw new BadRequestException('Invalid document type'); if (!d.fileName?.trim() || !d.mimeType?.trim() || !Number.isInteger(d.size) || d.size <= 0 || d.size > 10 * 1024 * 1024) throw new BadRequestException('Invalid document metadata'); if (/[/\\]/.test(d.fileName)) throw new BadRequestException('Invalid filename'); }
    if (input.latitude !== undefined && input.latitude !== null && (typeof input.latitude !== 'number' || Number.isNaN(input.latitude) || input.latitude < -90 || input.latitude > 90)) throw new BadRequestException('latitude must be a number between -90 and 90');
    if (input.longitude !== undefined && input.longitude !== null && (typeof input.longitude !== 'number' || Number.isNaN(input.longitude) || input.longitude < -180 || input.longitude > 180)) throw new BadRequestException('longitude must be a number between -180 and 180');
  }

  /** Great-circle distance in kilometres between two coordinates. */
  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * Compares the submitted pin/manual coordinates against the admin-imported reference
   * coordinates for the selected district/subcity/zone/region (most specific first).
   * Returns verified=true when a reference point exists within tolerance, otherwise
   * verified=false so the application can still proceed but is flagged for manual review.
   */
  private async verifyLocation(latitude?: number | null, longitude?: number | null, geo?: { regionId?: string; zoneId?: string; subcityId?: string; districtId?: string }): Promise<boolean> {
    if (latitude === undefined || latitude === null || longitude === undefined || longitude === null || !geo) return false;
    const TOLERANCE_KM = 50;
    const [district, subcity, zone, region] = await Promise.all([
      geo.districtId ? this.prisma.district.findUnique({ where: { id: geo.districtId }, select: { latitude: true, longitude: true } }) : Promise.resolve(null),
      geo.subcityId ? this.prisma.subcityTown.findUnique({ where: { id: geo.subcityId }, select: { latitude: true, longitude: true } }) : Promise.resolve(null),
      geo.zoneId ? this.prisma.zoneCity.findUnique({ where: { id: geo.zoneId }, select: { latitude: true, longitude: true } }) : Promise.resolve(null),
      geo.regionId ? this.prisma.region.findUnique({ where: { id: geo.regionId }, select: { latitude: true, longitude: true } }) : Promise.resolve(null),
    ]);
    const reference = [district, subcity, zone, region].find((r) => r && r.latitude != null && r.longitude != null);
    if (!reference || reference.latitude == null || reference.longitude == null) return false;
    const distanceKm = this.haversineKm(latitude, longitude, reference.latitude, reference.longitude);
    return distanceKm <= TOLERANCE_KM;
  }

  async listTypes() { return this.prisma.institutionType.findMany({ where: { active: true }, orderBy: { name: 'asc' } }); }

  async createApplication(input: InstitutionApplicationInput) {
    await this.validateInput(input, true); const trackingCode = await this.trackingCode();
    const latitude = input.latitude ?? undefined; const longitude = input.longitude ?? undefined;
    const locationVerified = await this.verifyLocation(latitude, longitude, { regionId: input.regionId, zoneId: input.zoneId, subcityId: input.subcityId, districtId: input.districtId });
    const record = await this.prisma.institutionApplication.create({ data: { trackingCode, status: InstitutionApplicationStatus.DRAFT, institutionName: this.require(input.institutionName, 'institutionName'), alternativeName: this.clean(input.alternativeName), institutionTypeId: input.institutionTypeId, establishmentDate: new Date(input.establishmentDate), phone: this.require(input.phone, 'phone'), email: this.require(input.email, 'email'), secondaryPhone: this.clean(input.secondaryPhone), website: this.clean(input.website), regionId: input.regionId, zoneId: input.zoneId, subcityId: input.subcityId || undefined, districtId: input.districtId ?? (null as unknown as string), address: this.require(input.address, 'address'), mission: this.clean(input.mission), description: this.clean(input.description), services: this.clean(input.services), communityActivities: this.clean(input.communityActivities), latitude, longitude, locationVerified, applicantName: this.clean(input.applicantName), applicantPhone: this.clean(input.applicantPhone), applicantEmail: this.clean(input.applicantEmail), leaders: { create: input.leaders.map((l) => ({ fullName: this.require(l.fullName, 'leader.fullName'), role: this.require(l.role, 'leader.role'), phone: this.require(l.phone, 'leader.phone'), email: this.clean(l.email) })) }, staffSummary: input.staff ? { create: { imamCount: input.staff.imamCount ?? 0, teacherCount: input.staff.teacherCount ?? 0, administrativeStaffCount: input.staff.administrativeStaffCount ?? 0, otherStaffCount: input.staff.otherStaffCount ?? 0 } } : undefined, education: input.education ? { create: { studentCount: input.education.studentCount ?? 0, teacherCount: input.education.teacherCount ?? 0, educationLevels: input.education.educationLevels ?? [] } } : undefined }, include: { institutionType: true, leaders: true, staffSummary: true, education: true } });
    await this.prisma.auditLog.create({ data: { action: 'INSTITUTION_APPLICATION_SAVED', entityType: 'InstitutionApplication', entityId: record.id, metadata: { trackingCode } } }); return { id: record.id, trackingCode: record.trackingCode, status: record.status, phone: record.phone, submittedAt: record.submittedAt, latitude: record.latitude, longitude: record.longitude, locationVerified: record.locationVerified };
  }

  async submitPayment(trackingCode: string) {
    const app = await this.prisma.institutionApplication.findUnique({ where: { trackingCode: trackingCode.trim().toUpperCase() } });
    if (!app) throw new NotFoundException('Application not found');
    if (app.status !== InstitutionApplicationStatus.DRAFT) throw new ConflictException('Payment can only be submitted for a saved institution application');
    const updated = await this.prisma.institutionApplication.update({ where: { id: app.id }, data: { status: InstitutionApplicationStatus.SUBMITTED, submittedAt: new Date() } });
    await this.prisma.institutionStatusHistory.create({ data: { applicationId: app.id, fromStatus: InstitutionApplicationStatus.DRAFT, toStatus: InstitutionApplicationStatus.SUBMITTED, reason: 'Payment submitted' } });
    await this.prisma.auditLog.create({ data: { action: 'INSTITUTION_APPLICATION_SUBMITTED', entityType: 'InstitutionApplication', entityId: app.id, metadata: { trackingCode: app.trackingCode } } });
    return { id: updated.id, trackingCode: updated.trackingCode, status: updated.status, phone: updated.phone, submittedAt: updated.submittedAt };
  }

  async trackApplication(trackingCode: string, phone?: string) { const code = trackingCode.trim().toUpperCase(); if (!code) throw new BadRequestException('Tracking code is required'); const app = await this.prisma.institutionApplication.findUnique({ where: { trackingCode: code }, select: { trackingCode: true, status: true, submittedAt: true, createdAt: true, updatedAt: true, phone: true, applicantPhone: true, correctionReason: true, rejectionReason: true, decisionAt: true } }); if (!app || (phone && app.phone !== phone.trim() && app.applicantPhone !== phone.trim())) throw new NotFoundException('Application not found'); return { trackingCode: app.trackingCode, status: app.status, submittedAt: app.submittedAt, createdAt: app.createdAt, updatedAt: app.updatedAt, nextAction: app.status === 'CORRECTION_REQUIRED' ? 'Update the requested information and resubmit' : app.status === 'APPROVED' ? 'Application approved' : app.status === 'REJECTED' ? 'Review the decision information' : 'Wait for EIASC review', correctionRequirement: app.status === 'CORRECTION_REQUIRED' ? app.correctionReason : undefined, decisionInformation: app.status === 'REJECTED' ? app.rejectionReason : undefined, decisionAt: app.decisionAt }; }

  async updateApplication(id: string, input: InstitutionApplicationUpdateInput) { const app = await this.prisma.institutionApplication.findUnique({ where: { id } }); if (!app) throw new NotFoundException('Application not found'); if (!ACTIVE_APP.slice(0, 1).concat([InstitutionApplicationStatus.CORRECTION_REQUIRED]).includes(app.status)) throw new ConflictException('Application cannot be edited in its current status'); await this.validateInput(input, false); const data: any = {}; for (const key of ['institutionName','alternativeName','institutionTypeId','phone','email','secondaryPhone','website','regionId','zoneId','subcityId','districtId','address','mission','description','services','communityActivities','applicantName','applicantPhone','applicantEmail'] as const) if (input[key] !== undefined) data[key] = typeof input[key] === 'string' ? this.clean(input[key]) : input[key]; if (input.establishmentDate) data.establishmentDate = new Date(input.establishmentDate);
    if (input.latitude !== undefined) data.latitude = input.latitude; if (input.longitude !== undefined) data.longitude = input.longitude;
    if (input.latitude !== undefined || input.longitude !== undefined || input.regionId !== undefined || input.zoneId !== undefined || input.subcityId !== undefined || input.districtId !== undefined) {
      const latitude = data.latitude !== undefined ? data.latitude : app.latitude; const longitude = data.longitude !== undefined ? data.longitude : app.longitude;
      data.locationVerified = await this.verifyLocation(latitude, longitude, { regionId: data.regionId ?? app.regionId, zoneId: data.zoneId ?? app.zoneId, subcityId: data.subcityId ?? app.subcityId ?? undefined, districtId: data.districtId ?? app.districtId });
    }
    const updated = await this.prisma.institutionApplication.update({ where: { id }, data }); return { id: updated.id, trackingCode: updated.trackingCode, status: updated.status, updatedAt: updated.updatedAt, latitude: updated.latitude, longitude: updated.longitude, locationVerified: updated.locationVerified }; }

  async resubmit(id: string, payment: InstitutionApplicationInput['payment']) { const app = await this.prisma.institutionApplication.findUnique({ where: { id } }); if (!app) throw new NotFoundException('Application not found'); if (app.status !== InstitutionApplicationStatus.CORRECTION_REQUIRED) throw new ConflictException('Application is not awaiting correction'); if (!payment) throw new BadRequestException('Registration payment is required before resubmission'); await this.payments.attachToApplication('INSTITUTION', id, payment); const updated = await this.prisma.institutionApplication.update({ where: { id }, data: { status: InstitutionApplicationStatus.RESUBMITTED, correctionReason: null, submittedAt: new Date() } }); await this.prisma.institutionStatusHistory.create({ data: { applicationId: id, fromStatus: app.status, toStatus: updated.status, reason: 'Applicant resubmitted' } }); await this.prisma.auditLog.create({ data: { action: 'INSTITUTION_APPLICATION_RESUBMITTED', entityType: 'InstitutionApplication', entityId: id } }); return { id, trackingCode: updated.trackingCode, status: updated.status }; }

  async queue(user: AuthenticatedUser, query: InstitutionListQuery) { const page = Math.max(1, Number(query.page ?? 1)); const pageSize = Math.min(100, Math.max(1, Number(query.pageSize ?? 25))); const where: any = {}; if (query.applicationStatus) where.status = query.applicationStatus; if (query.institutionTypeId) where.institutionTypeId = query.institutionTypeId; if (query.regionId) where.regionId = query.regionId; if (query.zoneId) where.zoneId = query.zoneId; if (query.subcityId) where.subcityId = query.subcityId; if (query.districtId) where.districtId = query.districtId; if (query.search) where.OR = [{ institutionName: { contains: query.search.trim(), mode: 'insensitive' } }, { trackingCode: { contains: query.search.trim(), mode: 'insensitive' } }]; if (query.institutionStatus) where.institution = { status: query.institutionStatus }; if (!user.roles.some((r) => ADMIN_ROLES.includes(r))) { if (!user.jurisdictionId) throw new ForbiddenException('No jurisdiction assigned'); const scope = { regionId: query.regionId, zoneId: query.zoneId, subcityId: query.subcityId, districtId: query.districtId }; if (!(await this.authorization.canAccess(user, scope))) { switch (user.jurisdictionLevel) { case 'REGION': where.regionId = user.jurisdictionId; break; case 'ZONE_CITY': where.zoneId = user.jurisdictionId; break; case 'SUBCITY_TOWN': where.subcityId = user.jurisdictionId; break; case 'DISTRICT': where.districtId = user.jurisdictionId; break; default: break; } } } const [items, total] = await this.prisma.$transaction([this.prisma.institutionApplication.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, include: { institutionType: true, institution: { select: { institutionCode: true, status: true } } } }), this.prisma.institutionApplication.count({ where })]); return { items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) }; }

  async detail(user: AuthenticatedUser, id: string) { const app = await this.prisma.institutionApplication.findUnique({ where: { id }, include: { institutionType: true, leaders: true, staffSummary: true, education: true, documents: true, history: { orderBy: { createdAt: 'asc' } }, institution: true } }); if (!app) throw new NotFoundException('Application not found'); await this.authorization.assertCanAccess(user, { regionId: app.regionId, zoneId: app.zoneId, subcityId: app.subcityId, districtId: app.districtId }); return app; }

  private async transition(user: AuthenticatedUser, id: string, target: InstitutionApplicationStatus, reason: string) { const app = await this.detail(user, id); const valid: Record<InstitutionApplicationStatus, InstitutionApplicationStatus[]> = { DRAFT: [InstitutionApplicationStatus.SUBMITTED], SUBMITTED: [InstitutionApplicationStatus.UNDER_REVIEW], UNDER_REVIEW: [InstitutionApplicationStatus.CORRECTION_REQUIRED, InstitutionApplicationStatus.APPROVED, InstitutionApplicationStatus.REJECTED], CORRECTION_REQUIRED: [InstitutionApplicationStatus.RESUBMITTED], RESUBMITTED: [InstitutionApplicationStatus.UNDER_REVIEW], APPROVED: [], REJECTED: [] }; if (!valid[app.status].includes(target)) throw new ConflictException(`Invalid application transition: ${app.status} -> ${target}`); if (!reason.trim()) throw new BadRequestException('Reason is required'); return { app, reason: this.require(reason, 'reason') }; }

  async review(user: AuthenticatedUser, id: string) {
    const app = await this.transition(user, id, InstitutionApplicationStatus.UNDER_REVIEW, 'Review started');
    const updated = await this.prisma.institutionApplication.update({ where: { id }, data: { status: InstitutionApplicationStatus.UNDER_REVIEW } });
    await this.prisma.institutionStatusHistory.create({ data: { applicationId: id, fromStatus: app.status, toStatus: updated.status, reason: 'Review started', actorUserId: user.id } });
    await this.prisma.auditLog.create({ data: { actorUserId: user.id, action: 'INSTITUTION_REVIEW_STARTED', entityType: 'InstitutionApplication', entityId: id, metadata: { fromStatus: app.status, toStatus: updated.status } } });
    return updated;
  }

  async requestCorrection(user: AuthenticatedUser, id: string, reason: string) { const { app } = await this.transition(user, id, InstitutionApplicationStatus.CORRECTION_REQUIRED, reason); const updated = await this.prisma.institutionApplication.update({ where: { id }, data: { status: InstitutionApplicationStatus.CORRECTION_REQUIRED, correctionReason: this.clean(reason) } }); await this.prisma.institutionStatusHistory.create({ data: { applicationId: id, fromStatus: app.status, toStatus: updated.status, reason: this.clean(reason), actorUserId: user.id } }); await this.prisma.auditLog.create({ data: { actorUserId: user.id, action: 'INSTITUTION_CORRECTION_REQUESTED', entityType: 'InstitutionApplication', entityId: id, metadata: { reason: this.clean(reason), fromStatus: app.status, toStatus: updated.status } } }); return updated; }

  async reject(user: AuthenticatedUser, id: string, reason: string) { const { app } = await this.transition(user, id, InstitutionApplicationStatus.REJECTED, reason); const updated = await this.prisma.institutionApplication.update({ where: { id }, data: { status: InstitutionApplicationStatus.REJECTED, rejectionReason: this.clean(reason), decisionAt: new Date() } }); await this.prisma.institutionStatusHistory.create({ data: { applicationId: id, fromStatus: app.status, toStatus: updated.status, reason: this.clean(reason), actorUserId: user.id } }); await this.prisma.auditLog.create({ data: { actorUserId: user.id, action: 'INSTITUTION_APPLICATION_REJECTED', entityType: 'InstitutionApplication', entityId: id, metadata: { reason: this.clean(reason), fromStatus: app.status, toStatus: updated.status } } }); return updated; }

  async approve(user: AuthenticatedUser, id: string) {
    const app = await this.prisma.institutionApplication.findUnique({
      where: { id },
      include: { institutionType: true, leaders: true, staffSummary: true, education: true },
    });
    if (!app) throw new NotFoundException('Institution application not found');
    await this.authorization.assertCanAccess(user, app);
    if (![InstitutionApplicationStatus.SUBMITTED, InstitutionApplicationStatus.UNDER_REVIEW, InstitutionApplicationStatus.RESUBMITTED].includes(app.status)) {
      throw new ConflictException(`Cannot approve a ${app.status.toLowerCase()} application`);
    }
    await this.payments.assertPaid('INSTITUTION', id);
    if (!app.locationVerified) throw new ConflictException('Institution location must be verified before approval');

    const template = await this.prisma.inspectionChecklistTemplate.findFirst({
      where: { institutionTypeId: app.institutionTypeId, active: true },
      orderBy: { version: 'desc' },
    });
    if (!template) throw new ConflictException(`No active inspection policy/checklist exists for organization type ${app.institutionType.name}`);
    if (template.inspectionRequired) {
      const inspection = await this.prisma.inspection.findFirst({
        where: { institutionApplicationId: id },
        orderBy: { createdAt: 'desc' },
      });
      if (!inspection || inspection.checklistTemplateId !== template.id || inspection.status !== 'COMPLETED' || !['PASS', 'CONDITIONAL'].includes(inspection.decision)) {
        throw new ConflictException(`A completed acceptable inspection is required for organization type ${app.institutionType.name}`);
      }
    }

    const code = this.institutionCode();
    const now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      const institution = await tx.institution.create({
        data: {
          institutionCode: code, name: app.institutionName, alternativeName: app.alternativeName, institutionTypeId: app.institutionTypeId,
          establishmentDate: app.establishmentDate, phone: app.phone, secondaryPhone: app.secondaryPhone, email: app.email, website: app.website,
          address: app.address, mission: app.mission, description: app.description, services: app.services, communityActivities: app.communityActivities,
          regionId: app.regionId, zoneId: app.zoneId, subcityId: app.subcityId, districtId: app.districtId, latitude: app.latitude, longitude: app.longitude,
          locationVerified: app.locationVerified, status: InstitutionStatus.ACTIVE,
          leaders: { create: app.leaders.map((l) => ({ fullName: l.fullName, role: l.role, phone: l.phone, email: l.email })) },
          staffSummary: app.staffSummary ? { create: { imamCount: app.staffSummary.imamCount, teacherCount: app.staffSummary.teacherCount, administrativeStaffCount: app.staffSummary.administrativeStaffCount, otherStaffCount: app.staffSummary.otherStaffCount } } : undefined,
          education: app.education ? { create: { studentCount: app.education.studentCount, teacherCount: app.education.teacherCount, educationLevels: app.education.educationLevels } } : undefined,
        },
      });
      await tx.institutionApplication.update({ where: { id }, data: { status: InstitutionApplicationStatus.APPROVED, institutionId: institution.id, decisionAt: now } });
      await tx.institutionStatusHistory.create({ data: { applicationId: id, institutionId: institution.id, toStatus: InstitutionApplicationStatus.APPROVED, reason: 'Application approved' } });
      await tx.institutionStatusHistory.create({ data: { institutionId: institution.id, toStatus: InstitutionStatus.ACTIVE, reason: 'Institution created through approval' } });
      await tx.auditLog.create({ data: { actorUserId: user.id, action: 'INSTITUTION_APPROVED', entityType: 'Institution', entityId: institution.id, metadata: { institutionCode: code, applicationId: id, organizationType: app.institutionType.code, inspectionRequired: template.inspectionRequired } } });
      return institution;
    });

    await this.credentials.provision({
      email: app.applicantEmail, phone: app.applicantPhone, role: RoleCode.INSTITUTION_ADMIN, jurisdictionLevel: 'INSTITUTION' as any,
      institutionId: result.id, recipientName: app.applicantName || app.institutionName,
    }).catch(() => undefined);
    return { institution: result, institutionCode: code, approvedAt: now, organizationType: app.institutionType };
  }

  private institutionDirectoryWhere(query: InstitutionListQuery & { from?: string; to?: string }) {
    const where: any = {};
    if (query.institutionStatus) where.status = query.institutionStatus;
    if (query.institutionTypeId) where.institutionTypeId = query.institutionTypeId;
    if (query.regionId) where.regionId = query.regionId;
    if (query.zoneId) where.zoneId = query.zoneId;
    if (query.subcityId) where.subcityId = query.subcityId;
    if (query.districtId) where.districtId = query.districtId;
    if (query.search?.trim()) where.OR = [
      { name: { contains: query.search.trim(), mode: 'insensitive' } },
      { institutionCode: { contains: query.search.trim(), mode: 'insensitive' } },
    ];
    const createdAt: { gte?: Date; lt?: Date } = {};
    if (query.from) { const d = new Date(query.from); if (!Number.isNaN(d.getTime())) createdAt.gte = d; }
    if (query.to) { const d = new Date(query.to); if (!Number.isNaN(d.getTime())) { d.setUTCDate(d.getUTCDate() + 1); createdAt.lt = d; } }
    if (createdAt.gte || createdAt.lt) where.createdAt = createdAt;
    return where;
  }

  async listInstitutions(user: AuthenticatedUser, query: InstitutionListQuery & { from?: string; to?: string }) {
    const page = Math.max(1, Number(query.page ?? 1)); const pageSize = Math.min(100, Math.max(1, Number(query.pageSize ?? 25)));
    const where = this.institutionDirectoryWhere(query);
    const requestedScope = { regionId: query.regionId, zoneId: query.zoneId, subcityId: query.subcityId, districtId: query.districtId };
    if (Object.values(requestedScope).some(Boolean)) await this.authorization.assertCanAccess(user, requestedScope);
    if (!(await this.authorization.canAccess(user, requestedScope))) {
      if (user.jurisdictionLevel === 'REGION') where.regionId = user.jurisdictionId;
      else if (user.jurisdictionLevel === 'ZONE_CITY') where.zoneId = user.jurisdictionId;
      else if (user.jurisdictionLevel === 'SUBCITY_TOWN') where.subcityId = user.jurisdictionId;
      else if (user.jurisdictionLevel === 'DISTRICT') where.districtId = user.jurisdictionId;
      else if (user.jurisdictionLevel === 'INSTITUTION') where.id = user.institutionId ?? user.jurisdictionId;
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.institution.findMany({ where, orderBy: [{ regionId: 'asc' }, { zoneId: 'asc' }, { subcityId: 'asc' }, { districtId: 'asc' }, { createdAt: 'desc' }], skip: (page - 1) * pageSize, take: pageSize, include: { type: true } }),
      this.prisma.institution.count({ where }),
    ]);
    return { items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
  }

  async exportInstitutions(user: AuthenticatedUser, query: InstitutionListQuery & { from?: string; to?: string }) {
    const where = this.institutionDirectoryWhere(query);
    const requestedScope = { regionId: query.regionId, zoneId: query.zoneId, subcityId: query.subcityId, districtId: query.districtId };
    if (Object.values(requestedScope).some(Boolean)) await this.authorization.assertCanAccess(user, requestedScope);
    if (!(await this.authorization.canAccess(user, requestedScope))) {
      if (user.jurisdictionLevel === 'REGION') where.regionId = user.jurisdictionId;
      else if (user.jurisdictionLevel === 'ZONE_CITY') where.zoneId = user.jurisdictionId;
      else if (user.jurisdictionLevel === 'SUBCITY_TOWN') where.subcityId = user.jurisdictionId;
      else if (user.jurisdictionLevel === 'DISTRICT') where.districtId = user.jurisdictionId;
      else if (user.jurisdictionLevel === 'INSTITUTION') where.id = user.institutionId ?? user.jurisdictionId;
    }
    const items = await this.prisma.institution.findMany({ where, orderBy: [{ regionId: 'asc' }, { zoneId: 'asc' }, { subcityId: 'asc' }, { districtId: 'asc' }, { name: 'asc' }], include: { type: true } });
    const cell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    return [
      ['Institution ID', 'Institution code', 'Institution', 'Organization type', 'Status', 'Region ID', 'Zone/City ID', 'Subcity/Town ID', 'District ID', 'Registered'].map(cell).join(','),
      ...items.map((i) => [i.id, i.institutionCode, i.name, i.type?.name, i.status, i.regionId, i.zoneId, i.subcityId, i.districtId, i.createdAt.toISOString()].map(cell).join(',')),
    ].join('\n');
  }

  async getInstitution(user: AuthenticatedUser, id: string) { const institution = await this.prisma.institution.findUnique({ where: { id }, include: { type: true, region: true, zone: true, subcity: true, district: true, leaders: true, staffSummary: true, education: true, statusHistory: { orderBy: { createdAt: 'asc' } } } }); if (!institution) throw new NotFoundException('Institution not found'); await this.authorization.assertCanAccess(user, { institutionId: id, regionId: institution.regionId, zoneId: institution.zoneId, subcityId: institution.subcityId, districtId: institution.districtId }); return institution; }

  async adminUser(user: AuthenticatedUser, id: string) { await this.getInstitution(user, id); const admin = await this.prisma.user.findFirst({ where: { institutionId: id }, select: { id: true, email: true, phone: true, status: true } }); return admin ?? null; }

  async updateInstitution(user: AuthenticatedUser, id: string, input: InstitutionProfileUpdateInput) { const institution = await this.getInstitution(user, id); if (institution.status === InstitutionStatus.CLOSED || institution.status === InstitutionStatus.REVOKED) throw new ConflictException('Institution cannot be edited in its current status'); const data: any = {}; for (const key of Object.keys(input)) if ((input as any)[key] !== undefined) data[key] = this.clean((input as any)[key]); const updated = await this.prisma.institution.update({ where: { id }, data }); await this.prisma.auditLog.create({ data: { action: 'INSTITUTION_PROFILE_UPDATED', entityType: 'Institution', entityId: id, metadata: { fields: Object.keys(data) } } }); return updated; }

  async changeStatus(user: AuthenticatedUser, id: string, status: InstitutionStatus, reason: string) { const institution = await this.getInstitution(user, id); if (!Object.values(InstitutionStatus).includes(status)) throw new BadRequestException('Invalid institution status'); if (!reason.trim()) throw new BadRequestException('Reason is required'); const allowed: Record<InstitutionStatus, InstitutionStatus[]> = { PENDING: [InstitutionStatus.ACTIVE], ACTIVE: [InstitutionStatus.SUSPENDED, InstitutionStatus.REVOKED, InstitutionStatus.CLOSED], SUSPENDED: [InstitutionStatus.ACTIVE, InstitutionStatus.REVOKED, InstitutionStatus.CLOSED], REVOKED: [], CLOSED: [] }; if (!allowed[institution.status].includes(status)) throw new ConflictException(`Invalid institution status transition: ${institution.status} -> ${status}`); const updated = await this.prisma.institution.update({ where: { id }, data: { status } }); await this.prisma.institutionStatusHistory.create({ data: { institutionId: id, fromStatus: institution.status, toStatus: status, reason: this.clean(reason) } }); await this.prisma.auditLog.create({ data: { action: 'INSTITUTION_STATUS_CHANGED', entityType: 'Institution', entityId: id, metadata: { from: institution.status, to: status, reason: this.clean(reason) } } }); return updated; }

  async members(user: AuthenticatedUser, id: string) { await this.getInstitution(user, id); const [items, total, active, suspended, pending] = await Promise.all([this.prisma.memberInstitution.findMany({ where: { institutionId: id }, include: { member: true }, orderBy: { createdAt: 'desc' } }), this.prisma.memberInstitution.count({ where: { institutionId: id } }), this.prisma.memberInstitution.count({ where: { institutionId: id, status: MembershipStatus.ACTIVE, member: { status: 'ACTIVE' } } }), this.prisma.memberInstitution.count({ where: { institutionId: id, status: MembershipStatus.SUSPENDED } }), this.prisma.memberInstitution.count({ where: { institutionId: id, status: MembershipStatus.PENDING } })]); return { items, counts: { total, active, suspended, pendingRelationships: pending } }; }
  async addMember(user: AuthenticatedUser, id: string, memberId: string, input: MemberRelationshipInput) {
    await this.getInstitution(user, id);
    return this.memberships.directAdd(user, {
      memberId,
      institutionId: id,
      relationshipType: input.relationshipType,
      reason: input.reason,
    });
  }

  async removeMember(user: AuthenticatedUser, id: string, memberId: string) {
    await this.getInstitution(user, id);
    const relation = await this.prisma.memberInstitution.findUnique({ where: { memberId_institutionId: { memberId, institutionId: id } } });
    if (!relation || relation.status !== MembershipStatus.ACTIVE) throw new NotFoundException('Active membership relationship not found');
    return this.memberships.setStatus(user, relation.id, MembershipStatus.ENDED, 'Institution removed member');
  }

}