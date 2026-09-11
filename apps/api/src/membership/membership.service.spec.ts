import { MembershipService } from './membership.service';
import { InstitutionRelationshipType, InstitutionStatus, MemberStatus, MembershipStatus, RoleCode, JurisdictionLevel } from '@prisma/client';

describe('MembershipService', () => {
  const prisma = {
    institution: { findUnique: jest.fn() },
    member: { findUnique: jest.fn() },
    memberInstitution: { findMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const authorization = { assertCanAccess: jest.fn() };
  const service = new MembershipService(prisma as never, authorization as never);
  const admin = { id: 'admin-1', roles: [RoleCode.NATIONAL_ADMIN], jurisdictionLevel: JurisdictionLevel.NATIONAL, jurisdictionId: null, institutionId: null };

  beforeEach(() => jest.clearAllMocks());

  it('creates an active relationship for active member and institution', async () => {
    prisma.member.findUnique.mockResolvedValue({ id: 'm1', status: MemberStatus.ACTIVE });
    prisma.institution.findUnique.mockResolvedValue({ id: 'i1', status: InstitutionStatus.ACTIVE });
    prisma.memberInstitution.findUnique.mockResolvedValue(null);
    prisma.memberInstitution.upsert.mockResolvedValue({ id: 'mi1', memberId: 'm1', institutionId: 'i1', status: MembershipStatus.ACTIVE });

    await expect(service.create(admin, { memberId: 'm1', institutionId: 'i1', relationshipType: InstitutionRelationshipType.PRIMARY })).resolves.toMatchObject({ id: 'mi1', status: MembershipStatus.ACTIVE });
    expect(authorization.assertCanAccess).toHaveBeenCalledWith(admin, { institutionId: 'i1' });
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('rejects affiliation to an inactive institution', async () => {
    prisma.member.findUnique.mockResolvedValue({ id: 'm1', status: MemberStatus.ACTIVE });
    prisma.institution.findUnique.mockResolvedValue({ id: 'i1', status: InstitutionStatus.SUSPENDED });
    await expect(service.create(admin, { memberId: 'm1', institutionId: 'i1' })).rejects.toThrow('Only active institutions can receive members');
  });

  it('requires a reason when membership ends', async () => {
    prisma.memberInstitution.findUnique.mockResolvedValue({ id: 'mi1', memberId: 'm1', institutionId: 'i1', status: MembershipStatus.ACTIVE, member: { status: MemberStatus.ACTIVE }, institution: { status: InstitutionStatus.ACTIVE } });
    await expect(service.updateStatus(admin, 'mi1', { status: MembershipStatus.ENDED })).rejects.toThrow('A reason is required');
  });
});
