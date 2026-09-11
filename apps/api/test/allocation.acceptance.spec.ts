import { AllocationService } from '../src/allocation/allocation.service';
import { AllocationPolicyStatus } from '@prisma/client';

describe('Allocation policy formula acceptance', () => {
  it('uses the approved policy formula and preserves an explicit equalization amount', async () => {
    const prisma = {
      allocationPolicy: { findUnique: jest.fn().mockResolvedValue({ id: 'p1', version: '2026.1', status: AllocationPolicyStatus.APPROVED, formulaDefinition: { perMemberMultiplier: 0.5, equalizationPerInstitution: 10 } }) },
      institution: { findMany: jest.fn().mockResolvedValue([{ id: 'i1' }, { id: 'i2' }]) },
      memberInstitution: { groupBy: jest.fn().mockResolvedValue([{ institutionId: 'i1', _count: { memberId: 1 } }]) },
      allocationRun: { create: jest.fn().mockResolvedValue({ id: 'r1' }), findUnique: jest.fn().mockResolvedValue({ id: 'r1', policyVersion: '2026.1', totalAllocated: 1020 }) },
      auditLog: { create: jest.fn() },
    } as any;
    const service = new AllocationService(prisma);
    const result = await service.preview({ id: 'u1', roles: ['SUPER_ADMIN'], jurisdictionLevel: 'NATIONAL', jurisdictionId: null, institutionId: null, email: null, phone: null, status: 'ACTIVE' } as any, { policyId: 'p1', period: '2026-Q1', fundingPool: 2000 });
    expect(prisma.allocationRun.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ policyVersion: '2026.1', equalizationPool: 20, totalAllocated: 1020 }) }));
    expect(prisma.auditLog.create).toHaveBeenCalled();
    expect(result.id).toBe('r1');
  });
});
