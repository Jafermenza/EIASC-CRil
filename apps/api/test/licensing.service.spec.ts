import { ConflictException, ForbiddenException } from '@nestjs/common';
import { LicenseApplicationStatus, LicenseStatus, RoleCode } from '@prisma/client';
import { LicensingService } from '../src/licensing/licensing.service';

const nationalUser = {
  id: 'admin-1', email: 'admin@example.test', phone: null, status: 'ACTIVE' as const,
  roles: [RoleCode.NATIONAL_ADMIN], jurisdictionLevel: 'NATIONAL' as const,
  jurisdictionId: null, institutionId: null,
};

const institutionAdmin = {
  ...nationalUser,
  id: 'institution-admin',
  roles: [RoleCode.INSTITUTION_ADMIN],
  jurisdictionLevel: 'INSTITUTION' as const,
  institutionId: 'institution-1',
};

function service() {
  const prisma: any = {
    institution: { findUnique: jest.fn() },
    license: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(async (queries: any) => Array.isArray(queries) ? Promise.all(queries) : queries(prisma)),
  };
  const authorization: any = { assertCanAccess: jest.fn().mockResolvedValue(undefined) };
  const instance = new LicensingService(prisma, authorization);
  return { instance, prisma, authorization };
}

describe('LicensingService', () => {
  it('rejects licensing decisions by institution administrators', async () => {
    const { instance } = service();
    await expect(instance.create(institutionAdmin, { institutionId: 'institution-1' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects licensing an institution that is not active', async () => {
    const { instance, prisma } = service();
    prisma.institution.findUnique.mockResolvedValue({
      id: 'institution-1', name: 'Test Mosque', institutionCode: 'I-1', status: 'PENDING',
      regionId: 'r1', zoneId: 'z1', subcityId: 's1', districtId: 'd1',
    });
    await expect(instance.create(nationalUser, { institutionId: 'institution-1' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects invalid application transitions', async () => {
    const { instance } = service();
    (instance as any).get = jest.fn().mockResolvedValue({
      id: 'license-1', institutionId: 'institution-1', status: LicenseStatus.PENDING,
      applicationStatus: LicenseApplicationStatus.APPROVED,
      institution: { regionId: 'r1', zoneId: 'z1', subcityId: 's1', districtId: 'd1' },
    });
    await expect(instance.review(nationalUser, 'license-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('requires an approved application before issuing a license', async () => {
    const { instance } = service();
    (instance as any).get = jest.fn().mockResolvedValue({
      id: 'license-1', institutionId: 'institution-1', status: LicenseStatus.PENDING,
      applicationStatus: LicenseApplicationStatus.UNDER_REVIEW,
      institution: { regionId: 'r1', zoneId: 'z1', subcityId: 's1', districtId: 'd1' },
    });
    await expect(instance.issue(nationalUser, 'license-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('requires a reason for revocation', async () => {
    const { instance } = service();
    await expect(instance.revoke(nationalUser, 'license-1', '   ')).rejects.toThrow('Reason is required');
  });
});
