import { jest } from '@jest/globals';
import { NotificationsService } from '../src/notifications/notifications.service';

describe('NotificationsService provider delivery', () => {
  const originalKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.RESEND_FROM_EMAIL;
  afterEach(() => { process.env.RESEND_API_KEY = originalKey; process.env.RESEND_FROM_EMAIL = originalFrom; jest.restoreAllMocks(); });

  it('sends an EMAIL notification through the configured Resend adapter and records SENT', async () => {
    process.env.RESEND_API_KEY = 'test-resend-key';
    process.env.RESEND_FROM_EMAIL = 'noreply@example.test';
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ email: 'member@example.test' }) },
      notification: { create: jest.fn().mockResolvedValue({ id: 'n1', recipientId: 'u1', channel: 'EMAIL', title: 'Approved', message: 'Approved', status: 'PENDING' }), update: jest.fn().mockResolvedValue({ id: 'n1', status: 'SENT' }) },
    } as any;
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    const service = new NotificationsService(prisma);
    const result = await service.notifyEvent('u1', { type: 'APPROVED', title: 'Approved', message: 'Your application was approved.' }, 'EMAIL' as any);
    expect(fetch).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({ method: 'POST' }));
    expect(prisma.notification.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'SENT' }) }));
    expect(result.status).toBe('SENT');
  });
});
