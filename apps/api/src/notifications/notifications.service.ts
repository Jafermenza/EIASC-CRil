import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma.service';

export type NotificationEvent = { type: string; title: string; message: string; metadata?: object };

interface NotificationProvider { send(input: { to: string; subject: string; message: string }): Promise<void>; }

class ResendEmailProvider implements NotificationProvider {
  constructor(private readonly apiKey: string, private readonly from: string) {}
  async send(input: { to: string; subject: string; message: string }) {
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' }, body: JSON.stringify({ from: this.from, to: [input.to], subject: input.subject, text: input.message }) });
    if (!response.ok) throw new Error(`Resend email delivery failed with HTTP ${response.status}`);
  }
}

@Injectable()
export class NotificationsService {
  private readonly emailProvider: NotificationProvider | null;
  constructor(private readonly prisma: PrismaService) {
    const key = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    this.emailProvider = key && from ? new ResendEmailProvider(key, from) : null;
  }

  async create(recipientId: string, input: NotificationEvent & { channel?: NotificationChannel }) {
    const recipient = await this.prisma.user.findUnique({ where: { id: recipientId }, select: { email: true } });
    const notification = await this.prisma.notification.create({ data: { recipientId, type: input.type, title: input.title, message: input.message, channel: input.channel ?? NotificationChannel.IN_APP, metadata: input.metadata } });
    if (notification.channel === NotificationChannel.IN_APP) return this.prisma.notification.update({ where: { id: notification.id }, data: { status: NotificationStatus.SENT, sentAt: new Date() } });
    if (notification.channel === NotificationChannel.EMAIL && this.emailProvider && recipient?.email) {
      try { await this.emailProvider.send({ to: recipient.email, subject: notification.title, message: notification.message }); return this.prisma.notification.update({ where: { id: notification.id }, data: { status: NotificationStatus.SENT, sentAt: new Date() } }); }
      catch (error) { return this.prisma.notification.update({ where: { id: notification.id }, data: { status: NotificationStatus.FAILED, metadata: { ...(input.metadata ?? {}), deliveryError: error instanceof Error ? error.message : 'Email delivery failed' } } }); }
    }
    return notification;
  }

  async notifyEvent(recipientId: string, event: NotificationEvent, channel: NotificationChannel = NotificationChannel.IN_APP) { return this.create(recipientId, { ...event, channel }); }

  async list(user: AuthenticatedUser, unreadOnly = false) {
    return this.prisma.notification.findMany({ where: { recipientId: user.id, ...(unreadOnly ? { readAt: null } : {}) }, orderBy: { createdAt: 'desc' }, take: 100 });
  }
  async markRead(user: AuthenticatedUser, id: string) {
    const notification = await this.prisma.notification.findFirst({ where: { id, recipientId: user.id } });
    if (!notification) throw new NotFoundException('Notification not found');
    return this.prisma.notification.update({ where: { id }, data: { readAt: new Date(), status: NotificationStatus.READ } });
  }
}
