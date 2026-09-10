import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { RegistrationStatus, RegistrationType } from '@prisma/client';
import { createOpaqueToken } from '../auth/crypto';
import { LocationsService } from '../locations/locations.service';
import { PrismaService } from '../prisma.service';
import { IndividualRegistrationInput, IndividualRegistrationRecord } from './registration.types';

@Injectable()
export class RegistrationsService {
  constructor(private readonly prisma: PrismaService, private readonly locations: LocationsService) {}

  private clean(value?: string): string | undefined {
    const trimmed = value?.trim();
    return trimmed || undefined;
  }

  private calculateAge(birthDate: Date, today = new Date()): number {
    let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
    const beforeBirthday = today.getUTCMonth() < birthDate.getUTCMonth() ||
      (today.getUTCMonth() === birthDate.getUTCMonth() && today.getUTCDate() < birthDate.getUTCDate());
    if (beforeBirthday) age -= 1;
    return age;
  }

  private async trackingCode(): Promise<string> {
    const year = new Date().getUTCFullYear();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const suffix = createOpaqueToken(5).replace(/[-_]/g, '').slice(0, 6).toUpperCase();
      const code = `EIASC-${year}-${suffix}`;
      const existing = await this.prisma.registration.findUnique({ where: { trackingCode: code }, select: { id: true } });
      if (!existing) return code;
    }
    throw new ConflictException('Unable to allocate a unique tracking code');
  }

  async createIndividual(input: IndividualRegistrationInput): Promise<IndividualRegistrationRecord> {
    if (!input.declarationAccepted) throw new BadRequestException('Declaration must be accepted');

    const required = [input.firstName, input.lastName, input.gender, input.maritalStatus, input.phone, input.regionId, input.zoneId, input.subcityId, input.districtId];
    if (required.some((value) => !this.clean(value))) throw new BadRequestException('Required registration fields are missing');

    const birthDate = new Date(input.birthDate);
    if (!input.birthDate || Number.isNaN(birthDate.getTime())) throw new BadRequestException('birthDate must be a valid date');
    const age = this.calculateAge(birthDate);
    if (age < 0 || age > 120) throw new BadRequestException('birthDate is outside the supported age range');

    const phone = this.clean(input.phone)!;
    const nationalIdentity = this.clean(input.nationalIdentity);
    const duplicate = await this.prisma.member.findFirst({
      where: { OR: [{ phone }, ...(nationalIdentity ? [{ nationalIdentity }] : [])] },
      select: { id: true, phone: true, nationalIdentity: true },
    });
    if (duplicate) throw new ConflictException('A member already exists with the supplied phone or national identity');

    await this.locations.validateHierarchy({
      regionId: input.regionId,
      zoneId: input.zoneId,
      subcityId: input.subcityId,
      districtId: input.districtId,
    });

    if (input.institutionId) {
      const institution = await this.prisma.institution.findUnique({ where: { id: input.institutionId }, select: { id: true, status: true } });
      if (!institution) throw new BadRequestException('Institution not found');
    }

    const trackingCode = await this.trackingCode();
    const now = new Date();
    const record = await this.prisma.registration.create({
      data: {
        trackingCode,
        type: RegistrationType.INDIVIDUAL,
        status: RegistrationStatus.SUBMITTED,
        declarationAccepted: true,
        firstName: this.clean(input.firstName),
        middleName: this.clean(input.middleName),
        lastName: this.clean(input.lastName),
        birthDate,
        gender: this.clean(input.gender),
        maritalStatus: this.clean(input.maritalStatus),
        phone,
        educationLevel: this.clean(input.educationLevel),
        employmentStatus: this.clean(input.employmentStatus),
        regionId: input.regionId,
        zoneId: input.zoneId,
        subcityId: input.subcityId,
        districtId: input.districtId,
        currentAddress: this.clean(input.currentAddress),
        nationalIdentity,
        institutionId: this.clean(input.institutionId),
        submittedAt: now,
      },
    });

    await this.prisma.auditLog.create({
      data: { action: 'REGISTRATION_SUBMITTED', entityType: 'Registration', entityId: record.id, metadata: { type: 'INDIVIDUAL', trackingCode } },
    });

    return {
      id: record.id,
      trackingCode: record.trackingCode,
      status: record.status,
      firstName: record.firstName!,
      middleName: record.middleName ?? undefined,
      lastName: record.lastName!,
      birthDate: record.birthDate!.toISOString(),
      gender: record.gender!,
      maritalStatus: record.maritalStatus!,
      phone: record.phone!,
      educationLevel: record.educationLevel ?? undefined,
      employmentStatus: record.employmentStatus ?? undefined,
      regionId: record.regionId!,
      zoneId: record.zoneId!,
      subcityId: record.subcityId!,
      districtId: record.districtId!,
      currentAddress: record.currentAddress ?? undefined,
      nationalIdentity: record.nationalIdentity ?? undefined,
      institutionId: record.institutionId ?? undefined,
      declarationAccepted: record.declarationAccepted,
      age,
      submittedAt: record.submittedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async track(trackingCode: string) {
    const code = trackingCode.trim().toUpperCase();
    if (!code) throw new BadRequestException('Tracking code is required');
    const registration = await this.prisma.registration.findUnique({ where: { trackingCode: code }, select: { type: true, trackingCode: true, status: true, submittedAt: true, createdAt: true, updatedAt: true } });
    if (!registration) throw new ConflictException('Application not found');
    return registration;
  }
}
