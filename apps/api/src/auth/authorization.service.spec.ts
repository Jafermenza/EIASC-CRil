import { RoleCode } from '@prisma/client';
import { jest } from '@jest/globals';
import { AuthorizationService } from './authorization.service';

describe('AuthorizationService', () => {
  const prisma = { institution: { findUnique: jest.fn() } } as any;
  const authorization = new AuthorizationService(prisma);

  it('allows a user only inside the assigned jurisdiction', async () => {
    const user = {
      id: 'regional-admin', email: null, phone: null, status: 'ACTIVE' as const,
      roles: [RoleCode.REGIONAL_ADMIN], jurisdictionLevel: 'REGION' as const,
      jurisdictionId: 'region-1', institutionId: null,
    };
    await expect(authorization.canAccess(user, { regionId: 'region-1' })).resolves.toBe(true);
    await expect(authorization.canAccess(user, { regionId: 'region-2' })).resolves.toBe(false);
  });

  it('allows institution administrators only their assigned institution', async () => {
    prisma.institution.findUnique.mockResolvedValue({
      id: 'institution-1', regionId: 'region-1', zoneId: 'zone-1', subcityId: 'subcity-1', districtId: 'district-1',
    });
    const user = {
      id: 'institution-admin', email: null, phone: null, status: 'ACTIVE' as const,
      roles: [RoleCode.INSTITUTION_ADMIN], jurisdictionLevel: 'INSTITUTION' as const,
      jurisdictionId: 'institution-1', institutionId: 'institution-1',
    };
    await expect(authorization.canAccess(user, { institutionId: 'institution-1' })).resolves.toBe(true);
    await expect(authorization.canAccess(user, { institutionId: 'institution-2' })).resolves.toBe(false);
  });
});
