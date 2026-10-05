import { ConflictException, ForbiddenException } from '@nestjs/common';
import { LicenseApplicationStatus, LicenseStatus, RoleCode } from '@prisma/client';
import { jest } from '@jest/globals';
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
  it('allows an institution administrator to create only its own license application', async () => {
    const { instance, prisma } = service();
    prisma.institution.findUnique.mockResolvedValue({
      id: 'institution-1', name: 'Test Mosque', institutionCode: 'I-1', status: 'ACTIVE',
      regionId: 'r1', zoneId: 'z1', subcityId: 's1', districtId: 'd1',
    });
    prisma.license.findFirst.mockResolvedValue(null);
    prisma.license.create.mockResolvedValue({ id: 'license-1', institutionId: 'institution-1', status: LicenseStatus.PENDING, applicationStatus: LicenseApplicationStatus.SUBMITTED });
    await expect(instance.create(institutionAdmin, { institutionId: 'institution-1' })).resolves.toMatchObject({ id: 'license-1' });
    await expect(instance.create(institutionAdmin, { institutionId: 'other-institution' })).rejects.toBeInstanceOf(ForbiddenException);
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

  it('blocks approval when the active organization checklist requires inspection', async () => {
    const { instance, prisma } = service();
    (instance as any).get = jest.fn().mockResolvedValue({
      id: 'license-1', institutionId: 'institution-1', status: LicenseStatus.PENDING,
      applicationStatus: LicenseApplicationStatus.UNDER_REVIEW,
      institution: { regionId: 'r1', zoneId: 'z1', subcityId: 's1', districtId: 'd1' },
    });
    prisma.institution.findUnique.mockResolvedValue({ id: 'institution-1', institutionTypeId: 'type-1', type: { id: 'type-1', code: 'MOSQUE', name: 'Mosque' } });
    prisma.inspectionChecklistTemplate.findFirst.mockResolvedValue({ id: 'checklist-1', inspectionRequired: true });
    prisma.inspectionChecklistTemplate.findFirst.mockResolvedValue({ id: 'checklist-1', inspectionRequired: true });
    prisma.inspection.findFirst.mockResolvedValue(null);
    await expect(instance.approve(nationalUser, 'license-1')).rejects.toThrow('completed passing licensing inspection');
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

  it('rejects an expiry date in the past during renewal', async () => {
    const { instance } = service();
    await expect(instance.renew(nationalUser, 'license-1', '2020-01-01T00:00:00.000Z')).rejects.toThrow('expiresAt must be a valid future date');
  });

  it('completes the accepted lifecycle and audits every decision', async () => {
    const { instance, prisma } = service();
    const state: any = {
      id: 'license-1',
      institutionId: 'institution-1',
      status: LicenseStatus.PENDING,
      applicationStatus: LicenseApplicationStatus.SUBMITTED,
      approvedBy: null,
      institution: { regionId: 'r1', zoneId: 'z1', subcityId: 's1', districtId: 'd1' },
    };
    (instance as any).get = jest.fn().mockImplementation(async () => state);
    prisma.license.update.mockImplementation(async ({ data }: any) => Object.assign(state, data));
    prisma.license.findUnique.mockResolvedValue(null);
    prisma.license.create.mockResolvedValue(state);
    await instance.review(nationalUser, state.id);
    state.applicationStatus = LicenseApplicationStatus.UNDER_REVIEW;
    await instance.requestCorrection(nationalUser, state.id, 'Provide the inspection report');
    state.applicationStatus = LicenseApplicationStatus.CORRECTION_REQUIRED;
    await instance.resubmit(nationalUser, state.id);
    state.applicationStatus = LicenseApplicationStatus.RESUBMITTED;
    await instance.review(nationalUser, state.id);
    state.applicationStatus = LicenseApplicationStatus.UNDER_REVIEW;
    await instance.approve(nationalUser, state.id);
    state.applicationStatus = LicenseApplicationStatus.APPROVED;
    await instance.issue(nationalUser, state.id, '2099-01-01T00:00:00.000Z');
    state.status = LicenseStatus.ACTIVE;
    await instance.suspend(nationalUser, state.id, 'Inspection required');
    state.status = LicenseStatus.SUSPENDED;
    await instance.restore(nationalUser, state.id);
    state.status = LicenseStatus.ACTIVE;
    await instance.renew(nationalUser, state.id, '2099-12-31T00:00:00.000Z');
    state.status = LicenseStatus.ACTIVE;
    await instance.revoke(nationalUser, state.id, 'License withdrawn by authority');
    expect(state.status).toBe(LicenseStatus.REVOKED);
    expect(state.licenseNumber).toMatch(/^EIASC-L-\d{4}-[A-Z0-9]{6}$/);
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(10);
  });

  it('supports rejecting an application with a reason', async () => {
    const { instance, prisma } = service();
    (instance as any).get = jest.fn().mockResolvedValue({
      id: 'license-1', institutionId: 'institution-1', status: LicenseStatus.PENDING,
      applicationStatus: LicenseApplicationStatus.UNDER_REVIEW,
      institution: { regionId: 'r1', zoneId: 'z1', subcityId: 's1', districtId: 'd1' },
    });
    prisma.license.update.mockResolvedValue({ applicationStatus: LicenseApplicationStatus.REJECTED });
    const result = await instance.reject(nationalUser, 'license-1', 'Eligibility evidence was insufficient');
    expect(result.applicationStatus).toBe(LicenseApplicationStatus.REJECTED);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'LICENSE_REJECTED' }),
    }));
  });

  it('does not allow an institution administrator to resubmit another institution license', async () => {
    const { instance, authorization } = service();
    authorization.assertCanAccess.mockRejectedValue(new ForbiddenException('Resource is outside your jurisdiction'));
    (instance as any).get = jest.fn().mockRejectedValue(new ForbiddenException('Resource is outside your jurisdiction'));
    await expect(instance.resubmit(institutionAdmin, 'license-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('marks an active license expired when it is read after its expiry', async () => {
    const { instance, prisma } = service();
    const expired = {
      id: 'license-1', institutionId: 'institution-1', status: LicenseStatus.ACTIVE,
      expiresAt: new Date('2020-01-01T00:00:00.000Z'),
      institution: { regionId: 'r1', zoneId: 'z1', subcityId: 's1', districtId: 'd1', documents: [] },
    };
    prisma.license.findUnique.mockResolvedValue(expired);
    prisma.$transaction.mockImplementation(async (callback: any) => callback(prisma));
    prisma.license.update.mockResolvedValue({ ...expired, status: LicenseStatus.EXPIRED });
    await expect(instance.get(nationalUser, 'license-1')).resolves.toEqual(expect.objectContaining({ status: LicenseStatus.EXPIRED }));
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'LICENSE_EXPIRED' }),
    }));
  });
});
