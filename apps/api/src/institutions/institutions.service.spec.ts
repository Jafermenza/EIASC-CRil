import { jest } from '@jest/globals';
import { InstitutionsService } from './institutions.service';

describe('InstitutionsService', () => {
  const prisma = {
    institutionApplication: { findUnique: jest.fn(), create: jest.fn() },
    institutionType: { findUnique: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const locations = { validateHierarchy: jest.fn() };
  const authorization = {};
  const credentials = {};
  const service = new InstitutionsService(prisma as never, locations as never, authorization as never, credentials as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.institutionApplication.findUnique.mockResolvedValue(null);
    prisma.institutionType.findUnique.mockResolvedValue({ id: 'type-1', active: true });
    prisma.institutionApplication.create.mockResolvedValue({
      id: 'application-1',
      trackingCode: 'EIASC-I-2026-ABC123',
      status: 'DRAFT',
      phone: '+251900000000',
      submittedAt: null,
    });
  });

  it('saves a complete institution application before payment', async () => {
    const result = await service.createApplication({
      institutionName: 'Example Mosque',
      institutionTypeId: 'type-1',
      establishmentDate: '2020-01-01',
      phone: '+251900000000',
      email: 'info@example.test',
      regionId: 'region-1',
      zoneId: 'zone-1',
      address: 'Addis Ababa',
      leaders: [{ fullName: 'Amina Ahmed', role: 'Director', phone: '+251911111111' }],
    });

    expect(result).toEqual({
      id: 'application-1',
      trackingCode: 'EIASC-I-2026-ABC123',
      status: 'DRAFT',
      phone: '+251900000000',
      submittedAt: null,
    });
    expect(prisma.institutionApplication.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'DRAFT' }),
    }));
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'INSTITUTION_APPLICATION_SAVED' }),
    }));
  });
});
