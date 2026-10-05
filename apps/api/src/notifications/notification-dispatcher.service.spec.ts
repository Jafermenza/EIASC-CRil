import { jest } from '@jest/globals';
import { NotificationDispatcherService } from './notification-dispatcher.service';

describe('NotificationDispatcherService', () => {
  function makeService(overrides: Record<string, unknown> = {}) {
    const prisma = {
      auditLog: { findMany: jest.fn().mockResolvedValue([]) },
      outboxEvent: {
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        update: jest.fn().mockResolvedValue({}),
        ...overrides.outboxEvent as object,
      },
      notificationDelivery: {
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        ...overrides.notificationDelivery as object,
      },
      license: { findUnique: jest.fn() },
      user: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn(), findUnique: jest.fn().mockResolvedValue({ email: 'user@example.test', phone: '+251900000000' }) },
      registration: { findUnique: jest.fn() },
      institutionApplication: { findUnique: jest.fn() },
      memberInstitution: { findUnique: jest.fn() },
      member: { findUnique: jest.fn() },
      credential: { findUnique: jest.fn() },
    };
    const notifications = { deliverDelivery: jest.fn().mockResolvedValue(null) };
    return { service: new NotificationDispatcherService(prisma as never, notifications as never), prisma, notifications };
  }

  it('materializes a stable event ID from the source audit record and creates idempotent channel deliveries', async () => {
    const { service, prisma } = makeService({
      auditLog: { findMany: jest.fn().mockResolvedValue([{ id: 'audit-1', action: 'LICENSE_APPROVED', entityType: 'License', entityId: 'license-1', metadata: { licenseNumber: 'EIASC-L-2026-ABC123' } }]) },
      outboxEvent: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([{
          id: 'outbox-1', eventId: 'audit-1', sourceAuditLogId: 'audit-1', eventType: 'LICENSE_APPROVED',
          aggregateType: 'License', aggregateId: 'license-1', payload: { action: 'LICENSE_APPROVED', metadata: { licenseNumber: 'EIASC-L-2026-ABC123' } }, status: 'PENDING',
        }]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({}),
      },
      notificationDelivery: { createMany: jest.fn().mockResolvedValue({ count: 3 }), findMany: jest.fn().mockResolvedValue([]) },
    });
    prisma.license.findUnique.mockResolvedValue({ institutionId: 'institution-1' });
    prisma.user.findMany.mockResolvedValue([{ id: 'user-1' }]);

    await service.process();

    expect(prisma.outboxEvent.createMany).toHaveBeenCalledWith(expect.objectContaining({
      skipDuplicates: true,
      data: [expect.objectContaining({ eventId: 'audit-1', sourceAuditLogId: 'audit-1' })],
    }));
    expect(prisma.notificationDelivery.createMany).toHaveBeenCalledWith(expect.objectContaining({
      skipDuplicates: true,
      data: expect.arrayContaining([
        expect.objectContaining({ outboxEventId: 'outbox-1', recipientId: 'user-1', channel: 'IN_APP' }),
        expect.objectContaining({ outboxEventId: 'outbox-1', recipientId: 'user-1', channel: 'EMAIL' }),
        expect.objectContaining({ outboxEventId: 'outbox-1', recipientId: 'user-1', channel: 'SMS' }),
      ]),
    }));
  });

  it('does not require a second outbox row when the same audit event is seen again', async () => {
    const { service, prisma } = makeService({
      auditLog: { findMany: jest.fn().mockResolvedValue([{ id: 'audit-1', action: 'LICENSE_APPROVED', entityType: 'License', entityId: 'license-1', metadata: {} }]) },
      outboxEvent: { createMany: jest.fn().mockResolvedValue({ count: 0 }), findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn(), update: jest.fn() },
    });

    await service.process();
    expect(prisma.outboxEvent.createMany).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true }));
  });

  it('processes persisted delivery work rather than sending directly from the audit scan', async () => {
    const { service, notifications, prisma } = makeService({
      notificationDelivery: {
        createMany: jest.fn(),
        findMany: jest.fn().mockResolvedValue([{ id: 'delivery-1' }]),
      },
    });

    await service.process();
    expect(notifications.deliverDelivery).toHaveBeenCalledWith('delivery-1');
    expect(prisma.notificationDelivery.findMany).toHaveBeenCalled();
  });
});
