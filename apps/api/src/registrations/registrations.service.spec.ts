import { ConflictException } from '@nestjs/common';
import { RegistrationsService } from './registrations.service';

describe('RegistrationsService', () => {
  const prisma = {
    registration: { findUnique: jest.fn(), create: jest.fn() },
    member: { findFirst: jest.fn() },
    institution: { findUnique: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const locations = { validateHierarchy: jest.fn() };
  const service = new RegistrationsService(prisma as never, locations as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.member.findFirst.mockResolvedValue(null);
    prisma.institution.findUnique.mockResolvedValue(null);
    prisma.registration.findUnique.mockResolvedValue(null);
    prisma.registration.create.mockResolvedValue({
      id: 'registration-1', trackingCode: 'EIASC-2026-ABC123', status: 'SUBMITTED', declarationAccepted: true,
      firstName: 'Amina', middleName: null, lastName: 'Ahmed', birthDate: new Date('1990-01-01'), gender: 'Female',
      maritalStatus: 'Single', phone: '+251900000000', educationLevel: null, employmentStatus: null,
      regionId: 'r', zoneId: 'z', subcityId: 's', districtId: 'd', currentAddress: null, nationalIdentity: null,
      institutionId: null, submittedAt: new Date('2026-09-10'), createdAt: new Date('2026-09-10'), updatedAt: new Date('2026-09-10'),
    });
  });

  it('submits a valid individual registration and returns a tracking code', async () => {
    const result = await service.createIndividual({
      firstName:'Amina', middleName:'', lastName:'Ahmed', birthDate:'1990-01-01', gender:'Female', maritalStatus:'Single',
      phone:'+251900000000', regionId:'r', zoneId:'z', subcityId:'s', districtId:'d', declarationAccepted:true,
    });
    expect(result.trackingCode).toMatch(/^EIASC-\d{4}-[A-Z0-9]{6}$/);
    expect(result.status).toBe('SUBMITTED');
    expect(locations.validateHierarchy).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('rejects a likely duplicate by phone', async () => {
    prisma.member.findFirst.mockResolvedValue({ id: 'member-1', phone: '+251900000000', nationalIdentity: null });
    await expect(service.createIndividual({
      firstName:'Amina', lastName:'Ahmed', birthDate:'1990-01-01', gender:'Female', maritalStatus:'Single',
      phone:'+251900000000', regionId:'r', zoneId:'z', subcityId:'s', districtId:'d', declarationAccepted:true,
    })).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.registration.create).not.toHaveBeenCalled();
  });
});
