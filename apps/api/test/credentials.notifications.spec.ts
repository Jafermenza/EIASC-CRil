import { CredentialsService } from '../src/credentials/credentials.service';

describe('Credential notification event', () => {
  it('emits in-app and email notifications when an institution credential is issued', async () => {
    const prisma = {
      institution: { findUnique: jest.fn().mockResolvedValue({ id: 'i1', status: 'ACTIVE' }) },
      credential: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'c1', credentialNumber: 'EIASC-I-2026-ABCD1234', type: 'INSTITUTION', status: 'ACTIVE', expiresAt: null }) },
      auditLog: { create: jest.fn() },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 'u2' }]) },
    } as any;
    const authorization = { assertCanAccess: jest.fn().mockResolvedValue(undefined) } as any;
    const notifications = { notifyEvent: jest.fn().mockResolvedValue({ status: 'SENT' }) } as any;
    const service = new CredentialsService(prisma, authorization, notifications);
    const result = await service.issue({ id: 'u1', roles: ['SUPER_ADMIN'], jurisdictionLevel: 'NATIONAL', jurisdictionId: null, institutionId: null, email: null, phone: null, status: 'ACTIVE' } as any, 'INSTITUTION' as any, 'i1');
    expect(result.credentialNumber).toContain('EIASC-I-');
    expect(notifications.notifyEvent).toHaveBeenCalledTimes(2);
    expect(notifications.notifyEvent.mock.calls[0][1].type).toBe('CREDENTIAL_ISSUED');
    expect(notifications.notifyEvent.mock.calls[1][1].type).toBe('CREDENTIAL_ISSUED_EMAIL');
  });
});
