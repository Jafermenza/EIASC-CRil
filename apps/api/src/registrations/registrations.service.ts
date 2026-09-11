import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { RegistrationStatus, RegistrationType } from '@prisma/client';
import { createOpaqueToken } from '../auth/crypto';
import { LocationsService } from '../locations/locations.service';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma.service';
import { ApplicationTrackingResult, IndividualRegistrationInput, IndividualRegistrationRecord } from './registration.types';

@Injectable()
export class RegistrationsService {
  constructor(private readonly prisma: PrismaService, private readonly locations: LocationsService, private readonly payments: PaymentsService) {}
  private clean(value?: string): string | undefined { const trimmed = value?.trim(); return trimmed || undefined; }
  private calculateAge(birthDate: Date, today = new Date()): number { let age = today.getUTCFullYear() - birthDate.getUTCFullYear(); const beforeBirthday = today.getUTCMonth() < birthDate.getUTCMonth() || (today.getUTCMonth() === birthDate.getUTCMonth() && today.getUTCDate() < birthDate.getUTCDate()); if (beforeBirthday) age -= 1; return age; }
  private async trackingCode(): Promise<string> { const year = new Date().getUTCFullYear(); for (let attempt = 0; attempt < 10; attempt += 1) { const suffix = createOpaqueToken(5).replace(/[-_]/g, '').slice(0, 6).toUpperCase(); const code = `EIASC-${year}-${suffix}`; const existing = await this.prisma.registration.findUnique({ where: { trackingCode: code }, select: { id: true } }); if (!existing) return code; } throw new ConflictException('Unable to allocate a unique tracking code'); }

  private async validateIndividual(input: IndividualRegistrationInput) {
    if (!input || !input.declarationAccepted) throw new BadRequestException('Declaration must be accepted');
    if (!input.payment) throw new BadRequestException('Registration payment is required before submission');
    const required = [input.firstName,input.lastName,input.gender,input.maritalStatus,input.phone,input.regionId,input.zoneId,input.districtId];
    if (required.some((value) => !this.clean(value))) throw new BadRequestException('Required registration fields are missing');
    const birthDate = new Date(input.birthDate); if (!input.birthDate || Number.isNaN(birthDate.getTime())) throw new BadRequestException('birthDate must be a valid date');
    const age = this.calculateAge(birthDate); if (age < 0 || age > 120) throw new BadRequestException('birthDate is outside the supported age range');
    const phone = this.clean(input.phone)!; const nationalIdentity = this.clean(input.nationalIdentity);
    const duplicateMember = await this.prisma.member.findFirst({ where: { OR: [{ phone }, ...(nationalIdentity ? [{ nationalIdentity }] : [])] }, select: { id: true } });
    if (duplicateMember) throw new ConflictException('A member already exists with the supplied phone or national identity');
    const duplicateRegistration = await this.prisma.registration.findFirst({ where: { type: RegistrationType.INDIVIDUAL, status: { in: [RegistrationStatus.DRAFT, RegistrationStatus.SUBMITTED, RegistrationStatus.UNDER_REVIEW, RegistrationStatus.CORRECTION, RegistrationStatus.RESUBMITTED] }, OR: [{ phone }, ...(nationalIdentity ? [{ nationalIdentity }] : [])] }, select: { id: true, trackingCode: true } });
    if (duplicateRegistration) throw new ConflictException(`An active application already exists: ${duplicateRegistration.trackingCode}`);
    await this.locations.validateHierarchy({ regionId: input.regionId, zoneId: input.zoneId, subcityId: input.subcityId, districtId: input.districtId });
    if (input.institutionId) { const institution = await this.prisma.institution.findUnique({ where: { id: input.institutionId }, select: { id: true, status: true, regionId: true, zoneId: true, subcityId: true, districtId: true } }); if (!institution) throw new BadRequestException('Institution not found'); if (institution.status !== 'ACTIVE') throw new BadRequestException('Institution affiliation is only available for active institutions'); if (institution.regionId !== input.regionId || institution.zoneId !== input.zoneId || (input.subcityId !== undefined && institution.subcityId !== input.subcityId) || institution.districtId !== input.districtId) throw new BadRequestException('Institution does not belong to the selected location'); }
    if (input.familyRelationship && !this.clean(input.familyMemberName)) throw new BadRequestException('familyMemberName is required when familyRelationship is supplied');
    if (input.familyMemberPhone && !this.clean(input.familyMemberName)) throw new BadRequestException('familyMemberName is required when familyMemberPhone is supplied');
    await this.payments.validateForSubmission('INDIVIDUAL', input.payment);
    return { birthDate, age, phone, nationalIdentity };
  }

  private toRecord(record: any, age: number): IndividualRegistrationRecord { return { id: record.id, trackingCode: record.trackingCode, status: record.status, firstName: record.firstName!, middleName: record.middleName ?? undefined, lastName: record.lastName!, birthDate: record.birthDate!.toISOString(), gender: record.gender!, maritalStatus: record.maritalStatus!, phone: record.phone!, educationLevel: record.educationLevel ?? undefined, employmentStatus: record.employmentStatus ?? undefined, regionId: record.regionId!, zoneId: record.zoneId!, subcityId: record.subcityId ?? undefined, districtId: record.districtId!, currentAddress: record.currentAddress ?? undefined, nationalIdentity: record.nationalIdentity ?? undefined, institutionId: record.institutionId ?? undefined, familyRelationship: record.familyRelationship ?? undefined, familyMemberName: record.familyMemberName ?? undefined, familyMemberPhone: record.familyMemberPhone ?? undefined, declarationAccepted: record.declarationAccepted, age, submittedAt: record.submittedAt, createdAt: record.createdAt, updatedAt: record.updatedAt }; }

  async createIndividual(input: IndividualRegistrationInput): Promise<IndividualRegistrationRecord> {
    const { birthDate, age, phone, nationalIdentity } = await this.validateIndividual(input); const trackingCode = await this.trackingCode(); const now = new Date();
    const record = await this.prisma.registration.create({ data: { trackingCode, type: RegistrationType.INDIVIDUAL, status: RegistrationStatus.SUBMITTED, declarationAccepted: true, firstName: this.clean(input.firstName), middleName: this.clean(input.middleName), lastName: this.clean(input.lastName), birthDate, gender: this.clean(input.gender), maritalStatus: this.clean(input.maritalStatus), phone, educationLevel: this.clean(input.educationLevel), employmentStatus: this.clean(input.employmentStatus), regionId: input.regionId, zoneId: input.zoneId, subcityId: input.subcityId, districtId: input.districtId, currentAddress: this.clean(input.currentAddress), nationalIdentity, institutionId: this.clean(input.institutionId), familyRelationship: this.clean(input.familyRelationship), familyMemberName: this.clean(input.familyMemberName), familyMemberPhone: this.clean(input.familyMemberPhone), submittedAt: now } });
    await this.payments.attachToApplication('INDIVIDUAL', record.id, input.payment);
    await this.prisma.auditLog.create({ data: { action: 'REGISTRATION_SUBMITTED', entityType: 'Registration', entityId: record.id, metadata: { type: 'INDIVIDUAL', trackingCode, paymentMethod: input.payment.method, paymentReference: input.payment.referenceNumber } } });
    return this.toRecord(record, age);
  }

  async resubmitIndividual(trackingCode: string, input: IndividualRegistrationInput): Promise<IndividualRegistrationRecord> {
    const code = trackingCode.trim().toUpperCase(); if (!code) throw new BadRequestException('Tracking code is required');
    const existing = await this.prisma.registration.findUnique({ where: { trackingCode: code } }); if (!existing) throw new NotFoundException('Application not found'); if (existing.type !== RegistrationType.INDIVIDUAL) throw new BadRequestException('Only individual applications can be resubmitted here'); if (existing.status !== RegistrationStatus.CORRECTION) throw new ConflictException('Application is not awaiting correction');
    const { birthDate, age, phone, nationalIdentity } = await this.validateIndividual(input); const now = new Date();
    const record = await this.prisma.registration.update({ where: { id: existing.id }, data: { status: RegistrationStatus.RESUBMITTED, declarationAccepted: true, firstName: this.clean(input.firstName), middleName: this.clean(input.middleName), lastName: this.clean(input.lastName), birthDate, gender: this.clean(input.gender), maritalStatus: this.clean(input.maritalStatus), phone, educationLevel: this.clean(input.educationLevel), employmentStatus: this.clean(input.employmentStatus), regionId: input.regionId, zoneId: input.zoneId, subcityId: input.subcityId, districtId: input.districtId, currentAddress: this.clean(input.currentAddress), nationalIdentity, institutionId: this.clean(input.institutionId), familyRelationship: this.clean(input.familyRelationship), familyMemberName: this.clean(input.familyMemberName), familyMemberPhone: this.clean(input.familyMemberPhone), correctionReason: null, submittedAt: now } });
    await this.payments.attachToApplication('INDIVIDUAL', record.id, input.payment);
    await this.prisma.auditLog.create({ data: { action: 'REGISTRATION_RESUBMITTED', entityType: 'Registration', entityId: record.id, metadata: { type: 'INDIVIDUAL', trackingCode: code, paymentReference: input.payment.referenceNumber } } }); return this.toRecord(record, age);
  }

  async track(trackingCode: string, phone?: string, firstName?: string): Promise<ApplicationTrackingResult> {
    const code = trackingCode.trim().toUpperCase(); if (!code) throw new BadRequestException('Tracking code is required');
    const registration = await this.prisma.registration.findUnique({ where: { trackingCode: code }, select: { type: true, trackingCode: true, status: true, submittedAt: true, createdAt: true, updatedAt: true, phone: true, firstName: true, correctionReason: true, rejectionReason: true, decisionAt: true } });
    if (!registration) throw new NotFoundException('Application not found'); if (phone && registration.phone !== phone.trim()) throw new NotFoundException('Application not found'); if (firstName && registration.firstName?.trim().toLowerCase() !== firstName.trim().toLowerCase()) throw new NotFoundException('Application not found');
    const nextActionByStatus: Record<RegistrationStatus, string> = { DRAFT: 'Complete and submit the application', SUBMITTED: 'Wait for EIASC review', UNDER_REVIEW: 'Application is being reviewed', CORRECTION: 'Update the requested information and resubmit', RESUBMITTED: 'Wait for EIASC review', APPROVED: 'Your application has been approved', REJECTED: 'Review the decision information', REVOKED: 'Contact EIASC for further information' };
    return { type: registration.type, trackingCode: registration.trackingCode, status: registration.status, submittedAt: registration.submittedAt, createdAt: registration.createdAt, updatedAt: registration.updatedAt, nextAction: nextActionByStatus[registration.status], correctionRequirement: registration.status === RegistrationStatus.CORRECTION ? registration.correctionReason ?? undefined : undefined, decisionInformation: registration.status === RegistrationStatus.REJECTED || registration.status === RegistrationStatus.APPROVED ? registration.rejectionReason ?? (registration.decisionAt ? `Decision recorded on ${registration.decisionAt.toISOString()}` : undefined) : undefined };
  }
}
