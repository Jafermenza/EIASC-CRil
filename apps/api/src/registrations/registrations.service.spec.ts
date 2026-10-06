import { ConflictException, NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { RegistrationsService } from './registrations.service';

describe('RegistrationsService', () => {
  const prisma = {
    registration: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    member: { findFirst: jest.fn() },
    institution: { findUnique: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const locations = { validateHierarchy: jest.fn() };
  const payments = { statusForApplication: jest.fn().mockResolvedValue({ required: true, amount: 100, currency: 'ETB', status: 'REQUIRED', nextAction: 'Payment is required.' }), validateForSubmission: jest.fn(), attachToApplication: jest.fn() };
  const service = new RegistrationsService(prisma as never, locations as never, payments as never);

  const input = {
    firstName: 'Amina', middleName: 'Hawa', lastName: 'Ahmed', birthDate: '1990-01-01', gender: 'Female', maritalStatus: 'Single',
    phone: '+251900000000', email: 'amina@example.test', educationLevel: 'Degree', employmentStatus: 'Employed', regionId: 'r', zoneId: 'z',
    subcityId: 's', districtId: 'd', currentAddress: 'Addis Ababa', declarationAccepted: true,
    payment: { method: 'BANK_TRANSFER' as const, referenceNumber: 'BANK-12345' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.member.findFirst.mockResolvedValue(null);
    prisma.institution.findUnique.mockResolvedValue(null);
    prisma.registration.findUnique.mockResolvedValue(null);
    prisma.registration.findFirst.mockResolvedValue(null);
    prisma.registration.create.mockResolvedValue({
      id: 'registration-1', trackingCode: 'EIASC-2026-ABC123', status: 'SUBMITTED', declarationAccepted: true,
      firstName: 'Amina', middleName: 'Hawa', lastName: 'Ahmed', birthDate: new Date('1990-01-01'), gender: 'Female',
      maritalStatus: 'Single', phone: '+251900000000', email: 'amina@example.test', educationLevel: 'Degree', employmentStatus: 'Employed',
      regionId: 'r', zoneId: 'z', subcityId: 's', districtId: 'd', currentAddress: 'Addis Ababa', nationalIdentity: null,
      institutionId: null, familyRelationship: null, familyMemberName: null, familyMemberPhone: null,
      correctionReason: null, rejectionReason: null, decisionAt: null, submittedAt: new Date('2026-09-10'),
      createdAt: new Date('2026-09-10'), updatedAt: new Date('2026-09-10'),
    });
    payments.validateForSubmission.mockResolvedValue({ amount: 100, method: input.payment.method, referenceNumber: input.payment.referenceNumber, receiptUrl: null });
    payments.attachToApplication.mockResolvedValue(null);
  });

  it('submits a valid individual registration and returns a tracking code', async () => {
    const result = await service.createIndividual(input);
    expect(result.trackingCode).toMatch(/^EIASC-\d{4}-[A-Z0-9]{6}$/);
    expect(result.status).toBe('SUBMITTED');
    expect(result.age).toBeGreaterThan(0);
    expect(locations.validateHierarchy).toHaveBeenCalledWith({ regionId: 'r', zoneId: 'z', subcityId: 's', districtId: 'd' });
    expect(payments.attachToApplication).toHaveBeenCalledWith('INDIVIDUAL', 'registration-1', input.payment);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'REGISTRATION_SUBMITTED' }) }));
  });

  it('saves a valid individual registration before payment', async () => {
    prisma.registration.create.mockResolvedValueOnce({
      id: 'registration-1', trackingCode: 'EIASC-2026-ABC123', status: 'DRAFT', declarationAccepted: true,
      firstName: 'Amina', middleName: 'Hawa', lastName: 'Ahmed', birthDate: new Date('1990-01-01'), gender: 'Female',
      maritalStatus: 'Single', phone: '+251900000000', email: 'amina@example.test', educationLevel: 'Degree', employmentStatus: 'Employed',
      regionId: 'r', zoneId: 'z', subcityId: 's', districtId: 'd', currentAddress: 'Addis Ababa', nationalIdentity: null,
      institutionId: null, familyRelationship: null, familyMemberName: null, familyMemberPhone: null,
      correctionReason: null, rejectionReason: null, decisionAt: null, submittedAt: null,
      createdAt: new Date('2026-09-10'), updatedAt: new Date('2026-09-10'),
    });
    const result = await service.createIndividual({ ...input, payment: undefined });
    expect(result).toEqual(expect.objectContaining({
      trackingCode: 'EIASC-2026-ABC123',
      status: 'DRAFT',
      phone: '+251900000000',
      submittedAt: null,
    }));
    expect(payments.attachToApplication).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'REGISTRATION_SAVED' }),
    }));
  });

  it('rejects a likely duplicate by phone', async () => {
    prisma.member.findFirst.mockResolvedValue({ id: 'member-1' });
    await expect(service.createIndividual(input)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.registration.create).not.toHaveBeenCalled();
  });

  it('rejects an active duplicate application', async () => {
    prisma.registration.findFirst.mockResolvedValue({ id: 'registration-2', trackingCode: 'EIASC-2026-ZZZ999' });
    await expect(service.createIndividual(input)).rejects.toThrow('An active application already exists: EIASC-2026-ZZZ999');
  });

  it('requires an active institution in the same location', async () => {
    prisma.institution.findUnique.mockResolvedValue({ id: 'inst-1', status: 'SUSPENDED', regionId: 'r', zoneId: 'z', subcityId: 's', districtId: 'd' });
    await expect(service.createIndividual({ ...input, institutionId: 'inst-1' })).rejects.toThrow('Institution affiliation is only available for active institutions');
  });

  it('tracks a public application without exposing private registration data', async () => {
    prisma.registration.findUnique.mockResolvedValue({
      type: 'INDIVIDUAL', trackingCode: 'EIASC-2026-ABC123', status: 'SUBMITTED', submittedAt: new Date('2026-09-10'),
      createdAt: new Date('2026-09-10'), updatedAt: new Date('2026-09-10'), phone: '+251900000000', firstName: 'Amina',
      correctionReason: null, rejectionReason: null, decisionAt: null,
    });
    const result = await service.track(' eiasc-2026-abc123 ', '+251900000000', 'amina');
    expect(result).toEqual(expect.objectContaining({ trackingCode: 'EIASC-2026-ABC123', status: 'SUBMITTED', nextAction: 'Payment is required.' }));
    expect(result).not.toHaveProperty('phone');
    expect(result).not.toHaveProperty('firstName');
  });

  it('requires matching optional tracking verification fields', async () => {
    prisma.registration.findUnique.mockResolvedValue({
      type: 'INDIVIDUAL', trackingCode: 'EIASC-2026-ABC123', status: 'SUBMITTED', submittedAt: null,
      createdAt: new Date(), updatedAt: new Date(), phone: '+251900000000', firstName: 'Amina',
      correctionReason: null, rejectionReason: null, decisionAt: null,
    });
    await expect(service.track('EIASC-2026-ABC123', '+251911111111')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('allows resubmission only from correction state', async () => {
    prisma.registration.findUnique.mockResolvedValue({
      id: 'registration-1', type: 'INDIVIDUAL', status: 'CORRECTION', trackingCode: 'EIASC-2026-ABC123',
    });
    prisma.registration.update.mockResolvedValue({
      id: 'registration-1', trackingCode: 'EIASC-2026-ABC123', status: 'RESUBMITTED', declarationAccepted: true,
      firstName: 'Amina', middleName: 'Hawa', lastName: 'Ahmed', birthDate: new Date('1990-01-01'), gender: 'Female',
      maritalStatus: 'Single', phone: '+251900000000', email: 'amina@example.test', educationLevel: 'Degree', employmentStatus: 'Employed',
      regionId: 'r', zoneId: 'z', subcityId: 's', districtId: 'd', currentAddress: 'Addis Ababa', nationalIdentity: null,
      institutionId: null, familyRelationship: null, familyMemberName: null, familyMemberPhone: null,
      correctionReason: null, rejectionReason: null, decisionAt: null, submittedAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
    });
    const result = await service.resubmitIndividual('EIASC-2026-ABC123', input);
    expect(result.status).toBe('RESUBMITTED');
    expect(payments.attachToApplication).toHaveBeenCalledWith('INDIVIDUAL', 'registration-1', input.payment);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'REGISTRATION_RESUBMITTED' }) }));
  });
});
