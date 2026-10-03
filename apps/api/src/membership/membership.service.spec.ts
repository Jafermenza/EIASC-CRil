import { jest } from '@jest/globals';
import { InstitutionRelationshipType, InstitutionStatus, MemberStatus, MembershipStatus, RoleCode, JurisdictionLevel } from '@prisma/client';
import { MembershipService } from './membership.service';

describe('MembershipService — Phase 6 integrity', () => {
  const prisma = {
    institution: { findUnique: jest.fn() },
    member: { findUnique: jest.fn() },
    user: { findMany: jest.fn() },
    memberInstitution: { findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    memberInstitutionHistory: { create: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const authorization = { assertCanAccess: jest.fn() };
  const notifications = { notifyEvent: jest.fn() };
  const service = new MembershipService(prisma as never, authorization as never, notifications as never);

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

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => unknown) => callback(prisma));
    prisma.user.findMany.mockResolvedValue([]);
    prisma.memberInstitutionHistory.create.mockResolvedValue({});
    prisma.auditLog.create.mockResolvedValue({});
    notifications.notifyEvent.mockResolvedValue({});
  });

  function activeTargets() {
    prisma.member.findUnique.mockResolvedValue({ id: 'm1', status: MemberStatus.ACTIVE, email: 'member@example.test', phone: '+251911000001', firstName: 'Test', lastName: 'Member' });
    prisma.institution.findUnique.mockResolvedValue({ id: 'i1', status: InstitutionStatus.ACTIVE, name: 'Test Institution' });
  }

  it('creates a PENDING request with durable history and notification', async () => {
    activeTargets();
    prisma.memberInstitution.findUnique.mockResolvedValue(null);
    prisma.memberInstitution.create.mockResolvedValue({ id: 'mi1', memberId: 'm1', institutionId: 'i1', relationshipType: InstitutionRelationshipType.PRIMARY, status: MembershipStatus.PENDING });

    await expect(service.request(admin, { memberId: 'm1', institutionId: 'i1' })).resolves.toMatchObject({ id: 'mi1', status: MembershipStatus.PENDING });
    expect(prisma.memberInstitutionHistory.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ toStatus: MembershipStatus.PENDING, effectiveFrom: null }) }));
    expect(prisma.auditLog.create).toHaveBeenCalled();
    expect(notifications.notifyEvent).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ type: 'MEMBERSHIP_REQUESTED' }));
  });

  it('blocks a second active PRIMARY affiliation before mutation', async () => {
    activeTargets();
    prisma.memberInstitution.findFirst.mockResolvedValue({ id: 'other', institutionId: 'other-institution' });
    await expect(service.directAdd(admin, { memberId: 'm1', institutionId: 'i1', relationshipType: InstitutionRelationshipType.PRIMARY })).rejects.toThrow('already has an active PRIMARY');
    expect(prisma.memberInstitution.create).not.toHaveBeenCalled();
  });

  it('supports explicit direct activation and records effective history', async () => {
    activeTargets();
    prisma.memberInstitution.findFirst.mockResolvedValue(null);
    prisma.memberInstitution.findUnique.mockResolvedValue(null);
    prisma.memberInstitution.create.mockResolvedValue({ id: 'mi1', memberId: 'm1', institutionId: 'i1', relationshipType: InstitutionRelationshipType.PRIMARY, status: MembershipStatus.ACTIVE });

    await expect(service.directAdd(admin, { memberId: 'm1', institutionId: 'i1' })).resolves.toMatchObject({ status: MembershipStatus.ACTIVE });
    expect(prisma.memberInstitutionHistory.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ toStatus: MembershipStatus.ACTIVE, effectiveFrom: expect.any(Date) }) }));
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'MEMBERSHIP_DIRECTLY_ACTIVATED' }) }));
  });

  it('requires a reason to suspend or end a membership', async () => {
    prisma.memberInstitution.findUnique.mockResolvedValue({ id: 'mi1', memberId: 'm1', institutionId: 'i1', relationshipType: InstitutionRelationshipType.PRIMARY, status: MembershipStatus.ACTIVE, endedAt: null });
    await expect(service.setStatus(admin, 'mi1', MembershipStatus.SUSPENDED)).rejects.toThrow('reason is required');
  });

  it('records END history and an effective end date', async () => {
    prisma.memberInstitution.findUnique.mockResolvedValue({ id: 'mi1', memberId: 'm1', institutionId: 'i1', relationshipType: InstitutionRelationshipType.PRIMARY, status: MembershipStatus.ACTIVE, endedAt: null });
    prisma.memberInstitution.update.mockResolvedValue({ id: 'mi1', memberId: 'm1', institutionId: 'i1', relationshipType: InstitutionRelationshipType.PRIMARY, status: MembershipStatus.ENDED, endedAt: new Date() });
    prisma.member.findUnique.mockResolvedValue({ id: 'm1', firstName: 'Test', lastName: 'Member' });
    prisma.institution.findUnique.mockResolvedValue({ id: 'i1', name: 'Test Institution' });

    await expect(service.setStatus(admin, 'mi1', MembershipStatus.ENDED, 'Member left institution')).resolves.toMatchObject({ status: MembershipStatus.ENDED });
    expect(prisma.memberInstitutionHistory.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ toStatus: MembershipStatus.ENDED, effectiveTo: expect.any(Date), reason: 'Member left institution' }) }));
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'MEMBERSHIP_ENDED' }) }));
    expect(notifications.notifyEvent).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ type: 'MEMBERSHIP_ENDED' }));
  });
});
