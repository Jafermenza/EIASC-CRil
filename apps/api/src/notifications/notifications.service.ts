import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(recipientId: string, input: { type: string; title: string; message: string; channel?: NotificationChannel; metadata?: object }) {
    return this.prisma.notification.create({ data: { recipientId, type: input.type, title: input.title, message: input.message, channel: input.channel ?? NotificationChannel.IN_APP, metadata: input.metadata } });
  }
  async list(user: AuthenticatedUser, unreadOnly = false) {
    return this.prisma.notification.findMany({ where: { recipientId: user.id, ...(unreadOnly ? { readAt: null } : {}) }, orderBy: { createdAt: 'desc' }, take: 100 });
  }
  async markRead(user: AuthenticatedUser, id: string) {
    const notification = await this.prisma.notification.findFirst({ where: { id, recipientId: user.id } });
    if (!notification) throw new NotFoundException('Notification not found');
    return this.prisma.notification.update({ where: { id }, data: { readAt: new Date(), status: NotificationStatus.READ } });
  }
}
