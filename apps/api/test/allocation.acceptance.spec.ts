import { jest } from '@jest/globals';
import { AllocationService } from '../src/allocation/allocation.service';
import { AllocationPolicyStatus, RoleCode } from '@prisma/client';

describe('Allocation policy formula acceptance', () => {
  it('uses the approved policy formula and preserves an explicit equalization amount', async () => {
    const prisma = {
      allocationPolicy: { findUnique: jest.fn().mockResolvedValue({ id: 'p1', version: '2026.1', status: AllocationPolicyStatus.APPROVED, eligibilityRules: {}, formulaDefinition: { perMemberMultiplier: 0.5, equalizationPerInstitution: 10 } }) },
      institution: { findMany: jest.fn().mockResolvedValue([{ id: 'i1' }, { id: 'i2' }]) },
      memberInstitution: { groupBy: jest.fn().mockResolvedValue([{ institutionId: 'i1', _count: { memberId: 1 } }]) },
      allocationRun: { create: jest.fn().mockResolvedValue({ id: 'r1' }), findUnique: jest.fn().mockResolvedValue({ id: 'r1', policyVersion: '2026.1', totalAllocated: 1020 }) },
      auditLog: { create: jest.fn() },
    } as any;
    const authorization = { assertAnyRole: jest.fn((user, roles: RoleCode[]) => { if (!roles.some((role) => user.roles.includes(role))) throw new Error('forbidden'); }) } as any;
    const service = new AllocationService(prisma, authorization);
    const result = await service.preview({ id: 'u1', roles: [RoleCode.SUPER_ADMIN], jurisdictionLevel: 'NATIONAL', jurisdictionId: null, institutionId: null, email: null, phone: null, status: 'ACTIVE' } as any, { policyId: 'p1', period: '2026-Q1', fundingPool: 2000 });
    expect(prisma.allocationRun.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ policyVersion: '2026.1', equalizationPool: 20, totalAllocated: 1020 }) }));
    expect(result.id).toBe('r1');
  });
});
