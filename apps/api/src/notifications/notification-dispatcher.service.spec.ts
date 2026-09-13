import { NotificationChannel } from '@prisma/client';
import { NotificationDispatcherService } from './notification-dispatcher.service';

describe('NotificationDispatcherService', () => {
  it('dispatches an audit event to institution recipients across supported channels', async () => {
    const prisma = {
      auditLog: { findMany: jest.fn().mockResolvedValue([{ id: 'audit-1', action: 'LICENSE_APPROVED', entityType: 'License', entityId: 'license-1', metadata: { licenseNumber: 'EIASC-L-2026-ABC123' } }]) },
      notification: { findFirst: jest.fn().mockResolvedValue(null) },
      license: { findUnique: jest.fn().mockResolvedValue({ institutionId: 'institution-1' }) },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 'user-1' }]) },
    };
    const notifications = { notifyEvent: jest.fn().mockResolvedValue({ id: 'notification-1', status: 'SENT' }) };
    const service = new NotificationDispatcherService(prisma as never, notifications as never);

    await service.process();

    expect(notifications.notifyEvent).toHaveBeenCalledTimes(3);
    expect(notifications.notifyEvent).toHaveBeenNthCalledWith(
      1,
      'user-1',
      expect.objectContaining({ type: 'LICENSE_APPROVED', metadata: expect.objectContaining({ sourceAuditLogId: 'audit-1' }) }),
    );
    expect(notifications.notifyEvent).toHaveBeenNthCalledWith(2, 'user-1', expect.anything(), NotificationChannel.EMAIL);
    expect(notifications.notifyEvent).toHaveBeenNthCalledWith(3, 'user-1', expect.anything(), NotificationChannel.SMS);
  });

  it('does not dispatch an already processed audit event', async () => {
    const prisma = {
      auditLog: { findMany: jest.fn().mockResolvedValue([{ id: 'audit-1', action: 'LICENSE_APPROVED', entityType: 'License', entityId: 'license-1', metadata: {} }]) },
      notification: { findFirst: jest.fn().mockResolvedValue({ id: 'existing' }) },
      license: { findUnique: jest.fn() },
      user: { findMany: jest.fn() },
    };
    const notifications = { notifyEvent: jest.fn() };
    const service = new NotificationDispatcherService(prisma as never, notifications as never);

    await service.process();

    expect(notifications.notifyEvent).not.toHaveBeenCalled();
  });
});
