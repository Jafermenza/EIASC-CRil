import { jest } from '@jest/globals';
import { MembershipService } from './membership.service';
import { InstitutionRelationshipType, InstitutionStatus, MemberStatus, MembershipStatus, RoleCode, JurisdictionLevel } from '@prisma/client';

describe('MembershipService', () => {
  const prisma = {
    institution: { findUnique: jest.fn() },
    member: { findUnique: jest.fn() },
    memberInstitution: { findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const authorization = { assertCanAccess: jest.fn() };
  const service = new MembershipService(prisma as never, authorization as never);
  const admin = {
    id: 'admin-1',
    email: null,
    phone: null,
    status: 'ACTIVE' as const,
    roles: [RoleCode.NATIONAL_ADMIN],
    jurisdictionLevel: JurisdictionLevel.NATIONAL,
    jurisdictionId: null,
    institutionId: null,
  };

  beforeEach(() => jest.clearAllMocks());

  it('creates a pending relationship for an active member and institution', async () => {
    prisma.member.findUnique.mockResolvedValue({ id: 'm1', status: MemberStatus.ACTIVE });
    prisma.institution.findUnique.mockResolvedValue({ id: 'i1', status: InstitutionStatus.ACTIVE });
    prisma.memberInstitution.findFirst.mockResolvedValue(null);
    prisma.memberInstitution.create.mockResolvedValue({ id: 'mi1', memberId: 'm1', institutionId: 'i1', status: MembershipStatus.PENDING });

    await expect(service.request(admin, { memberId: 'm1', institutionId: 'i1', relationshipType: InstitutionRelationshipType.PRIMARY })).resolves.toMatchObject({ id: 'mi1', status: MembershipStatus.PENDING });
    expect(authorization.assertCanAccess).toHaveBeenCalledWith(admin, { institutionId: 'i1' });
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('rejects affiliation to an inactive institution', async () => {
    prisma.member.findUnique.mockResolvedValue({ id: 'm1', status: MemberStatus.ACTIVE });
    prisma.institution.findUnique.mockResolvedValue({ id: 'i1', status: InstitutionStatus.SUSPENDED });
    await expect(service.request(admin, { memberId: 'm1', institutionId: 'i1' })).rejects.toThrow('Institution must be active');
  });

  it('records an end timestamp when an authorized administrator ends membership', async () => {
    prisma.memberInstitution.findUnique.mockResolvedValue({ id: 'mi1', memberId: 'm1', institutionId: 'i1', status: MembershipStatus.ACTIVE, endedAt: null });
    prisma.memberInstitution.update.mockResolvedValue({ id: 'mi1', status: MembershipStatus.ENDED });

    await expect(service.setStatus(admin, 'mi1', MembershipStatus.ENDED)).resolves.toMatchObject({ id: 'mi1', status: MembershipStatus.ENDED });
    expect(prisma.memberInstitution.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: MembershipStatus.ENDED, endedAt: expect.any(Date) }) }));
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });
});
