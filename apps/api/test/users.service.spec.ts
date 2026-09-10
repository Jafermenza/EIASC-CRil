import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { JurisdictionLevel, RoleCode, UserStatus } from '@prisma/client';
import { UsersService } from '../src/users/users.service';

const actor = (roles: RoleCode[] = [RoleCode.SUPER_ADMIN]) => ({ id: 'actor', email: 'admin@example.test', phone: null, status: UserStatus.ACTIVE, roles, jurisdictionLevel: JurisdictionLevel.NATIONAL, jurisdictionId: null, institutionId: null });

describe('UsersService', () => {
  const prisma: any = {
    user: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    role: { findUnique: jest.fn() },
    userRole: { create: jest.fn(), deleteMany: jest.fn() },
    region: { findUnique: jest.fn() },
    zoneCity: { findUnique: jest.fn() },
    subcityTown: { findUnique: jest.fn() },
    district: { findUnique: jest.fn() },
    institution: { findUnique: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(async (callback: any) => callback(prisma)),
  };
  const authorization: any = { assertCanAccess: jest.fn() };
  let service: UsersService;

  beforeEach(() => { jest.clearAllMocks(); service = new UsersService(prisma, authorization); });

  it('creates a user and role assignment', async () => {
    prisma.role.findUnique.mockResolvedValue({ id: 'role-id' });
    prisma.user.create.mockResolvedValue({ id: 'new-user', email: 'new@example.test', phone: null, status: UserStatus.ACTIVE, jurisdictionLevel: JurisdictionLevel.NATIONAL, jurisdictionId: null, institutionId: null });
    prisma.user.findUnique.mockResolvedValue({ id: 'new-user', email: 'new@example.test', phone: null, status: UserStatus.ACTIVE, jurisdictionLevel: JurisdictionLevel.NATIONAL, jurisdictionId: null, institutionId: null, roles: [{ role: { code: RoleCode.REGISTRAR } }] });
    const result = await service.create(actor(), { email: 'NEW@EXAMPLE.TEST', password: 'long-enough-password', role: RoleCode.REGISTRAR, jurisdictionLevel: JurisdictionLevel.NATIONAL });
    expect(result.roles).toEqual([RoleCode.REGISTRAR]);
    expect(prisma.userRole.create).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'USER_CREATED' }) }));
  });

  it('prevents non-super administrators from assigning SUPER_ADMIN', async () => {
    await expect(service.create({ ...actor([RoleCode.NATIONAL_ADMIN]), jurisdictionLevel: JurisdictionLevel.NATIONAL }, { email: 'x@example.test', password: 'long-enough-password', role: RoleCode.SUPER_ADMIN, jurisdictionLevel: JurisdictionLevel.NATIONAL })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires the correct jurisdiction for regional administrators', async () => {
    await expect(service.create(actor(), { email: 'x@example.test', password: 'long-enough-password', role: RoleCode.REGIONAL_ADMIN, jurisdictionLevel: JurisdictionLevel.NATIONAL })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects missing jurisdiction records', async () => {
    prisma.region.findUnique.mockResolvedValue(null);
    await expect(service.create(actor(), { email: 'x@example.test', password: 'long-enough-password', role: RoleCode.REGISTRAR, jurisdictionLevel: JurisdictionLevel.REGION, jurisdictionId: 'missing' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
