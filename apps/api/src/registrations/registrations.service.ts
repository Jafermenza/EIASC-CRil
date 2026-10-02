import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { RegistrationStatus, RegistrationType, RoleCode, MemberStatus } from '@prisma/client';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { createOpaqueToken } from '../auth/crypto';
import { LocationsService } from '../locations/locations.service';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma.service';
import { CredentialProvisioningService } from '../auth/credential-provisioning.service';
import { ApplicationTrackingResult, IndividualRegistrationInput, IndividualRegistrationRecord, IndividualRegistrationStatus } from './registration.types';

@Injectable()
export class RegistrationsService {
  constructor(private readonly prisma: PrismaService, private readonly locations: LocationsService, private readonly payments: PaymentsService, private readonly authorization: AuthorizationService, private readonly credentials: CredentialProvisioningService) {}
  private clean(value?: string): string | undefined { const trimmed = value?.trim(); return trimmed || undefined; }
  private calculateAge(birthDate: Date, today = new Date()): number { let age = today.getUTCFullYear() - birthDate.getUTCFullYear(); const beforeBirthday = today.getUTCMonth() < birthDate.getUTCMonth() || (today.getUTCMonth() === birthDate.getUTCMonth() && today.getUTCDate() < birthDate.getUTCDate()); if (beforeBirthday) age -= 1; return age; }
  private async trackingCode(): Promise<string> { const year = new Date().getUTCFullYear(); for (let attempt = 0; attempt < 10; attempt += 1) { const suffix = createOpaqueToken(5).replace(/[-_]/g, '').slice(0, 6).toUpperCase(); const code = `EIASC-${year}-${suffix}`; const existing = await this.prisma.registration.findUnique({ where: { trackingCode: code }, select: { id: true } }); if (!existing) return code; } throw new ConflictException('Unable to allocate a unique tracking code'); }

  private async validateIndividual(input: IndividualRegistrationInput, excludeRegistrationId?: string) {
    if (!input || !input.declarationAccepted) throw new BadRequestException('Declaration must be accepted');
    const required = [input.firstName,input.lastName,input.gender,input.maritalStatus,input.phone,input.email,input.regionId,input.zoneId];
    if (required.some((value) => !this.clean(value))) throw new BadRequestException('Required registration fields are missing');
    const birthDate = new Date(input.birthDate); if (!input.birthDate || Number.isNaN(birthDate.getTime())) throw new BadRequestException('birthDate must be a valid date');
    const age = this.calculateAge(birthDate); if (age < 0 || age > 120) throw new BadRequestException('birthDate is outside the supported age range');
    const phone = this.clean(input.phone)!; const nationalIdentity = this.clean(input.nationalIdentity);
    const email = this.clean(input.email)?.toLowerCase(); if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('A valid email address is required');
    const duplicateMember = await this.prisma.member.findFirst({ where: { OR: [{ phone }, { email }, ...(nationalIdentity ? [{ nationalIdentity }] : [])] }, select: { id: true, phone: true, email: true } });
    if (duplicateMember) throw new ConflictException(duplicateMember.email === email ? 'A member already exists with the supplied email address' : 'A member already exists with the supplied phone or national identity');
    const duplicateRegistration = await this.prisma.registration.findFirst({ where: { type: RegistrationType.INDIVIDUAL, status: { in: [RegistrationStatus.DRAFT, RegistrationStatus.SUBMITTED, RegistrationStatus.UNDER_REVIEW, RegistrationStatus.CORRECTION, RegistrationStatus.RESUBMITTED] }, id: excludeRegistrationId ? { not: excludeRegistrationId } : undefined, OR: [{ phone }, { email }, ...(nationalIdentity ? [{ nationalIdentity }] : [])] }, select: { id: true, trackingCode: true } });
    if (duplicateRegistration) throw new ConflictException(`An active application already exists: ${duplicateRegistration.trackingCode}`);
    await this.locations.validateHierarchy({ regionId: input.regionId, zoneId: input.zoneId, subcityId: input.subcityId, districtId: input.districtId });
    if (input.institutionId) { const institution = await this.prisma.institution.findUnique({ where: { id: input.institutionId }, select: { id: true, status: true, regionId: true, zoneId: true, subcityId: true, districtId: true } }); if (!institution) throw new BadRequestException('Institution not found'); if (institution.status !== 'ACTIVE') throw new BadRequestException('Institution affiliation is only available for active institutions'); if (institution.regionId !== input.regionId || institution.zoneId !== input.zoneId || (input.subcityId !== undefined && institution.subcityId !== input.subcityId) || (input.districtId !== undefined && institution.districtId !== input.districtId)) throw new BadRequestException('Institution does not belong to the selected location'); }
    if (input.familyRelationship && !this.clean(input.familyMemberName)) throw new BadRequestException('familyMemberName is required when familyRelationship is supplied');
    if (input.familyMemberPhone && !this.clean(input.familyMemberName)) throw new BadRequestException('familyMemberName is required when familyMemberPhone is supplied');
    if (input.payment) await this.payments.validateForSubmission('INDIVIDUAL', input.payment);
    return { birthDate, age, phone, email, nationalIdentity };
  }

  private toRecord(record: any, age: number): IndividualRegistrationRecord { return { id: record.id, trackingCode: record.trackingCode, status: record.status, firstName: record.firstName!, middleName: record.middleName ?? undefined, lastName: record.lastName!, birthDate: record.birthDate!.toISOString(), gender: record.gender!, maritalStatus: record.maritalStatus!, phone: record.phone!, email: record.email!, educationLevel: record.educationLevel ?? undefined, fieldOfStudy: record.fieldOfStudy ?? undefined, employmentStatus: record.employmentStatus ?? undefined, careerRole: record.careerRole ?? undefined, regionId: record.regionId!, zoneId: record.zoneId!, subcityId: record.subcityId ?? undefined, districtId: record.districtId ?? undefined, currentAddress: record.currentAddress ?? undefined, nationalIdentity: record.nationalIdentity ?? undefined, institutionId: record.institutionId ?? undefined, familyRelationship: record.familyRelationship ?? undefined, familyMemberName: record.familyMemberName ?? undefined, familyMemberPhone: record.familyMemberPhone ?? undefined, declarationAccepted: record.declarationAccepted, age, submittedAt: record.submittedAt, createdAt: record.createdAt, updatedAt: record.updatedAt }; }

  async createIndividual(input: IndividualRegistrationInput): Promise<IndividualRegistrationRecord> {
    const { birthDate, age, phone, email, nationalIdentity } = await this.validateIndividual(input); const trackingCode = await this.trackingCode(); const now = new Date();
    const record = await this.prisma.registration.create({ data: { trackingCode, type: RegistrationType.INDIVIDUAL, status: input.payment ? RegistrationStatus.SUBMITTED : RegistrationStatus.DRAFT, declarationAccepted: true, firstName: this.clean(input.firstName), middleName: this.clean(input.middleName), lastName: this.clean(input.lastName), birthDate, gender: this.clean(input.gender), maritalStatus: this.clean(input.maritalStatus), phone, email, educationLevel: this.clean(input.educationLevel), fieldOfStudy: this.clean(input.fieldOfStudy), employmentStatus: this.clean(input.employmentStatus), careerRole: this.clean(input.careerRole), regionId: input.regionId, zoneId: input.zoneId, subcityId: input.subcityId || undefined, districtId: input.districtId || undefined, currentAddress: this.clean(input.currentAddress), nationalIdentity, institutionId: this.clean(input.institutionId), familyRelationship: this.clean(input.familyRelationship), familyMemberName: this.clean(input.familyMemberName), familyMemberPhone: this.clean(input.familyMemberPhone), submittedAt: input.payment ? now : undefined } });
    if (input.payment) await this.payments.attachToApplication('INDIVIDUAL', record.id, input.payment);
    await this.prisma.auditLog.create({ data: { action: input.payment ? 'REGISTRATION_SUBMITTED' : 'REGISTRATION_SAVED', entityType: 'Registration', entityId: record.id, metadata: { type: 'INDIVIDUAL', trackingCode, ...(input.payment ? { paymentMethod: input.payment.method, paymentReference: input.payment.referenceNumber } : {}) } } });
    return this.toRecord(record, age);
  }

  async submitPayment(trackingCode: string, payment: IndividualRegistrationInput['payment']): Promise<IndividualRegistrationRecord> {
    const code = trackingCode.trim().toUpperCase();
    if (!code || !payment) throw new BadRequestException('Tracking code and payment are required');
    const record = await this.prisma.registration.findUnique({ where: { trackingCode: code } });
    if (!record) throw new NotFoundException('Application not found');
    if (record.type !== RegistrationType.INDIVIDUAL || record.status !== RegistrationStatus.DRAFT) throw new ConflictException('Payment can only be submitted for a saved individual application');
    await this.payments.attachToApplication('INDIVIDUAL', record.id, payment);
    const updated = await this.prisma.registration.update({ where: { id: record.id }, data: { status: RegistrationStatus.SUBMITTED, submittedAt: new Date() } });
    await this.prisma.auditLog.create({ data: { action: 'REGISTRATION_SUBMITTED', entityType: 'Registration', entityId: record.id, metadata: { type: 'INDIVIDUAL', trackingCode: code, paymentMethod: payment.method, paymentReference: payment.referenceNumber } } });
    return this.toRecord(updated, this.calculateAge(updated.birthDate!));
  }

  async resubmitIndividual(trackingCode: string, input: IndividualRegistrationInput): Promise<IndividualRegistrationRecord> {
    const code = trackingCode.trim().toUpperCase(); if (!code) throw new BadRequestException('Tracking code is required');
    if (!input.payment) throw new BadRequestException('Registration payment is required before resubmission');
    const existing = await this.prisma.registration.findUnique({ where: { trackingCode: code } }); if (!existing) throw new NotFoundException('Application not found'); if (existing.type !== RegistrationType.INDIVIDUAL) throw new BadRequestException('Only individual applications can be resubmitted here'); if (existing.status !== RegistrationStatus.CORRECTION) throw new ConflictException('Application is not awaiting correction');
    const { birthDate, age, phone, email, nationalIdentity } = await this.validateIndividual(input, existing.id); const now = new Date();
    const record = await this.prisma.registration.update({ where: { id: existing.id }, data: { status: RegistrationStatus.RESUBMITTED, declarationAccepted: true, firstName: this.clean(input.firstName), middleName: this.clean(input.middleName), lastName: this.clean(input.lastName), birthDate, gender: this.clean(input.gender), maritalStatus: this.clean(input.maritalStatus), phone, email, educationLevel: this.clean(input.educationLevel), fieldOfStudy: this.clean(input.fieldOfStudy), employmentStatus: this.clean(input.employmentStatus), careerRole: this.clean(input.careerRole), regionId: input.regionId, zoneId: input.zoneId, subcityId: input.subcityId || undefined, districtId: input.districtId || undefined, currentAddress: this.clean(input.currentAddress), nationalIdentity, institutionId: this.clean(input.institutionId), familyRelationship: this.clean(input.familyRelationship), familyMemberName: this.clean(input.familyMemberName), familyMemberPhone: this.clean(input.familyMemberPhone), correctionReason: null, submittedAt: now } });
    await this.payments.attachToApplication('INDIVIDUAL', record.id, input.payment);
    await this.prisma.auditLog.create({ data: { action: 'REGISTRATION_RESUBMITTED', entityType: 'Registration', entityId: record.id, metadata: { type: 'INDIVIDUAL', trackingCode: code, paymentReference: input.payment.referenceNumber } } }); return this.toRecord(record, age);
  }

  async track(trackingCode: string, phone?: string, firstName?: string): Promise<ApplicationTrackingResult> {
    const code = trackingCode.trim().toUpperCase(); if (!code) throw new BadRequestException('Tracking code is required');
    const registration = await this.prisma.registration.findUnique({ where: { trackingCode: code }, select: { id: true, type: true, trackingCode: true, status: true, submittedAt: true, createdAt: true, updatedAt: true, phone: true, firstName: true, correctionReason: true, rejectionReason: true, decisionAt: true } });
    if (registration) {
      const payment = await this.payments.statusForApplication('INDIVIDUAL', registration.id);
      if (phone && registration.phone !== phone.trim()) throw new NotFoundException('Application not found'); if (firstName && registration.firstName?.trim().toLowerCase() !== firstName.trim().toLowerCase()) throw new NotFoundException('Application not found');
      const nextActionByStatus: Record<RegistrationStatus, string> = { DRAFT: 'Complete and submit the application', SUBMITTED: 'Wait for EIASC review', UNDER_REVIEW: 'Application is being reviewed', CORRECTION: 'Update the requested information and resubmit', RESUBMITTED: 'Wait for EIASC review', APPROVED: 'Your application has been approved', REJECTED: 'Review the decision information', REVOKED: 'Contact EIASC for further information' };
      return { type: registration.type, trackingCode: registration.trackingCode, status: registration.status, submittedAt: registration.submittedAt, createdAt: registration.createdAt, updatedAt: registration.updatedAt, nextAction: payment.required && payment.status !== 'PAID' ? payment.nextAction : nextActionByStatus[registration.status], correctionRequirement: registration.status === RegistrationStatus.CORRECTION ? registration.correctionReason ?? undefined : undefined, decisionInformation: registration.status === RegistrationStatus.REJECTED || registration.status === RegistrationStatus.APPROVED ? registration.rejectionReason ?? (registration.decisionAt ? `Decision recorded on ${registration.decisionAt.toISOString()}` : undefined) : undefined, payment };
    }
    // Institution applications use their own tracking-code sequence and table. The public
    // tracking page accepts either code type, so fall back here instead of reporting "not found".
    const application = await this.prisma.institutionApplication.findUnique({ where: { trackingCode: code }, select: { id: true, trackingCode: true, status: true, submittedAt: true, createdAt: true, updatedAt: true, phone: true, applicantPhone: true, correctionReason: true, rejectionReason: true, decisionAt: true } });
    if (!application) throw new NotFoundException('Application not found');
    const payment = await this.payments.statusForApplication('INSTITUTION', application.id);
    if (phone && application.phone !== phone.trim() && application.applicantPhone !== phone.trim()) throw new NotFoundException('Application not found');
    const institutionNextActionByStatus: Record<string, string> = { DRAFT: 'Complete and submit the application', SUBMITTED: 'Wait for EIASC review', UNDER_REVIEW: 'Application is being reviewed', CORRECTION_REQUIRED: 'Update the requested information and resubmit', RESUBMITTED: 'Wait for EIASC review', APPROVED: 'Application approved', REJECTED: 'Review the decision information', REVOKED: 'Contact EIASC for further information' };
    return { type: 'INSTITUTION', trackingCode: application.trackingCode, status: application.status as unknown as IndividualRegistrationStatus, submittedAt: application.submittedAt, createdAt: application.createdAt, updatedAt: application.updatedAt, nextAction: payment.required && payment.status !== 'PAID' ? payment.nextAction : (institutionNextActionByStatus[application.status] ?? 'Wait for EIASC review'), correctionRequirement: application.status === 'CORRECTION_REQUIRED' ? application.correctionReason ?? undefined : undefined, decisionInformation: application.status === 'REJECTED' || application.status === 'APPROVED' ? application.rejectionReason ?? (application.decisionAt ? `Decision recorded on ${application.decisionAt.toISOString()}` : undefined) : undefined, payment };
  }

  private assertReviewRole(user: AuthenticatedUser) {
    const reviewRoles: RoleCode[] = [RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.REGISTRAR];
    if (!user.roles.some((role) => reviewRoles.includes(role))) throw new ConflictException('Registration review permission required');
  }

  async listMembers(user: AuthenticatedUser, query: { status?: string; regionId?: string; zoneId?: string; subcityId?: string; districtId?: string; search?: string; page?: string; pageSize?: string }) {
    this.assertReviewRole(user);
    const page = Math.max(1, Number(query.page ?? 1)); const pageSize = Math.min(200, Math.max(1, Number(query.pageSize ?? 50)));
    const where: any = {};
    if (query.status) where.status = query.status;
    for (const key of ['regionId', 'zoneId', 'subcityId', 'districtId'] as const) if (query[key]) where[key] = query[key];
    if (query.search?.trim()) where.OR = [{ firstName: { contains: query.search.trim(), mode: 'insensitive' } }, { lastName: { contains: query.search.trim(), mode: 'insensitive' } }, { phone: { contains: query.search.trim() } }, { membershipNumber: { contains: query.search.trim(), mode: 'insensitive' } }];
    if (!(await this.authorization.canAccess(user, { regionId: query.regionId, zoneId: query.zoneId, subcityId: query.subcityId, districtId: query.districtId }))) {
      switch (user.jurisdictionLevel) { case 'REGION': where.regionId = user.jurisdictionId; break; case 'ZONE_CITY': where.zoneId = user.jurisdictionId; break; case 'SUBCITY_TOWN': where.subcityId = user.jurisdictionId; break; case 'DISTRICT': where.districtId = user.jurisdictionId; break; default: break; }
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.member.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.member.count({ where }),
    ]);
    return { items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
  }

  async memberDetail(user: AuthenticatedUser, id: string) {
    this.assertReviewRole(user);
    const member = await this.prisma.member.findUnique({ where: { id } });
    if (!member) throw new NotFoundException('Member not found');
    if (!(await this.authorization.canAccess(user, { regionId: member.regionId, zoneId: member.zoneId, subcityId: member.subcityId, districtId: member.districtId }))) throw new ConflictException('Member is outside your jurisdiction');
    const loginUser = member.phone ? await this.prisma.user.findFirst({ where: { phone: member.phone }, select: { id: true, status: true } }) : null;
    const credential = await this.prisma.credential.findFirst({ where: { memberId: id }, orderBy: { issuedAt: 'desc' }, select: { credentialNumber: true, status: true, issuedAt: true, expiresAt: true } });
    return { ...member, loginUserId: loginUser?.id ?? null, loginUserStatus: loginUser?.status ?? null, credential };
  }

  async updateMember(user: AuthenticatedUser, id: string, input: Record<string, unknown>) {
    const member = await this.prisma.member.findUnique({ where: { id } });
    if (!member) throw new NotFoundException('Member not found');
    if (!(await this.authorization.canAccess(user, { regionId: member.regionId, zoneId: member.zoneId, subcityId: member.subcityId, districtId: member.districtId }))) throw new ConflictException('Member is outside your jurisdiction');
    const fields = ['firstName', 'middleName', 'lastName', 'phone', 'email', 'educationLevel', 'fieldOfStudy', 'employmentStatus', 'careerRole', 'currentAddress', 'nationalIdentity'] as const;
    const data: Record<string, string | null> = {};
    for (const field of fields) {
      if (input[field] === undefined) continue;
      if (typeof input[field] !== 'string') throw new BadRequestException(`${field} must be a string`);
      data[field] = this.clean(input[field]) ?? null;
    }
    if (!Object.keys(data).length) throw new BadRequestException('Provide at least one editable member field');
    if ('firstName' in data && !data.firstName) throw new BadRequestException('firstName is required');
    if ('lastName' in data && !data.lastName) throw new BadRequestException('lastName is required');
    if ('phone' in data && !data.phone) throw new BadRequestException('phone is required');
    if ('email' in data && data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new BadRequestException('A valid email address is required');
    try {
      const updated = await this.prisma.member.update({ where: { id }, data });
      await this.prisma.auditLog.create({ data: { actorUserId: user.id, action: 'MEMBER_UPDATED', entityType: 'Member', entityId: id, metadata: { fields: Object.keys(data) } } });
      return updated;
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Phone, email, or national identity is already registered');
      throw error;
    }
  }

  private async scoped(user: AuthenticatedUser, id?: string) {
    this.assertReviewRole(user);
    const registration = id ? await this.prisma.registration.findUnique({ where: { id }, include: { member: true } }) : null;
    if (id && !registration) throw new NotFoundException('Registration not found');
    if (registration && !(await this.authorization.canAccess(user, { regionId: registration.regionId, zoneId: registration.zoneId, subcityId: registration.subcityId, districtId: registration.districtId }))) throw new ConflictException('Registration is outside your jurisdiction');
    return registration;
  }

  async queue(user: AuthenticatedUser, status?: string) {
    this.assertReviewRole(user);
    const registrations = await this.prisma.registration.findMany({ where: { type: RegistrationType.INDIVIDUAL, status: status ? status as RegistrationStatus : { in: [RegistrationStatus.SUBMITTED, RegistrationStatus.UNDER_REVIEW, RegistrationStatus.CORRECTION, RegistrationStatus.RESUBMITTED] } }, orderBy: { submittedAt: 'desc' }, take: 200 });
    const items = [];
    for (const registration of registrations) {
      if (await this.authorization.canAccess(user, { regionId: registration.regionId, zoneId: registration.zoneId, subcityId: registration.subcityId, districtId: registration.districtId })) items.push(registration);
    }
    return items;
  }

  async detail(user: AuthenticatedUser, id: string) {
    const registration = await this.scoped(user, id);
    return { ...registration, payment: await this.payments.getForApplication('INDIVIDUAL', id) };
  }

  async review(user: AuthenticatedUser, id: string) { const registration = await this.scoped(user, id); const reviewStatuses: RegistrationStatus[] = [RegistrationStatus.SUBMITTED, RegistrationStatus.RESUBMITTED]; if (!reviewStatuses.includes(registration!.status)) throw new ConflictException('Registration is not awaiting review'); return this.prisma.registration.update({ where: { id }, data: { status: RegistrationStatus.UNDER_REVIEW } }); }

  async requestCorrection(user: AuthenticatedUser, id: string, reason: string) { const registration = await this.scoped(user, id); if (registration!.status !== RegistrationStatus.UNDER_REVIEW) throw new ConflictException('Registration must be under review'); return this.prisma.registration.update({ where: { id }, data: { status: RegistrationStatus.CORRECTION, correctionReason: this.clean(reason), decisionAt: null } }); }

  async reject(user: AuthenticatedUser, id: string, reason: string) { const registration = await this.scoped(user, id); if (registration!.status !== RegistrationStatus.UNDER_REVIEW) throw new ConflictException('Registration must be under review'); return this.prisma.registration.update({ where: { id }, data: { status: RegistrationStatus.REJECTED, rejectionReason: this.clean(reason), decisionAt: new Date() } }); }

  async approve(user: AuthenticatedUser, id: string) {
    const registration = await this.scoped(user, id);
    if (registration!.status !== RegistrationStatus.UNDER_REVIEW) throw new ConflictException('Registration must be under review');
    if (!registration!.regionId || !registration!.zoneId || !registration!.districtId || !registration!.birthDate || !registration!.firstName || !registration!.lastName || !registration!.gender || !registration!.maritalStatus || !registration!.phone || !registration!.email) throw new BadRequestException('Registration is missing required member data');
    await this.payments.assertPaid('INDIVIDUAL', id);
    const member = await this.prisma.$transaction(async (tx) => {
      const created = await tx.member.create({ data: { firstName: registration!.firstName!, middleName: registration!.middleName, lastName: registration!.lastName!, birthDate: registration!.birthDate!, gender: registration!.gender!, maritalStatus: registration!.maritalStatus!, phone: registration!.phone!, email: registration!.email!, educationLevel: registration!.educationLevel, fieldOfStudy: registration!.fieldOfStudy, employmentStatus: registration!.employmentStatus, careerRole: registration!.careerRole, nationalIdentity: registration!.nationalIdentity, currentAddress: registration!.currentAddress, regionId: registration!.regionId!, zoneId: registration!.zoneId!, subcityId: registration!.subcityId, districtId: registration!.districtId!, status: MemberStatus.ACTIVE } });
      await tx.registration.update({ where: { id }, data: { status: RegistrationStatus.APPROVED, memberId: created.id, decisionAt: new Date(), correctionReason: null } });
      return created;
    });
    const districtLevel: [any, string | null] = member.districtId ? ['DISTRICT', member.districtId] : member.subcityId ? ['SUBCITY_TOWN', member.subcityId] : member.zoneId ? ['ZONE_CITY', member.zoneId] : ['REGION', member.regionId];
    await this.credentials.provision({ email: member.email, phone: member.phone, role: RoleCode.MEMBER, jurisdictionLevel: districtLevel[0], jurisdictionId: districtLevel[1], recipientName: `${member.firstName} ${member.lastName}` }).catch(() => undefined);
    return { registrationId: id, memberId: member.id, status: RegistrationStatus.APPROVED };
  }
}
