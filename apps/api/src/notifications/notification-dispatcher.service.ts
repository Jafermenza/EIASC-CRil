import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { NotificationChannel, NotificationDeliveryStatus, OutboxEventStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from './notifications.service';

const EVENT_ACTIONS = [
  'REGISTRATION_SUBMITTED','REGISTRATION_RESUBMITTED',
  'INSTITUTION_APPLICATION_SUBMITTED','INSTITUTION_APPLICATION_RESUBMITTED',
  'LICENSE_APPLICATION_CREATED','LICENSE_APPLICATION_REVIEWED','LICENSE_CORRECTION_REQUESTED','LICENSE_APPROVED','LICENSE_REJECTED','LICENSE_RESUBMITTED','LICENSE_ISSUED','LICENSE_EXPIRED',
  'MEMBERSHIP_REQUESTED','MEMBERSHIP_ACTIVE','MEMBERSHIP_SUSPENDED','MEMBERSHIP_ENDED',
  'CREDENTIAL_ISSUED','CREDENTIAL_PUBLISHED',
] as const;
const MAX_ATTEMPTS = 8;

@Injectable()
export class NotificationDispatcherService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  onModuleInit() {
    void this.process();
    this.timer = setInterval(() => void this.process(), 15_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async process() {
    if (this.running) return;
    this.running = true;
    try {
      await this.recoverStaleWork();
      await this.materializeAuditEvents();
      await this.createPendingDeliveries();
      await this.processDeliveries();
      await this.reconcileOutbox();
    } finally {
      this.running = false;
    }
  }


  private async recoverStaleWork() {
    const cutoff = new Date(Date.now() - 10 * 60 * 1000);
    await this.prisma.outboxEvent.updateMany({ where: { status: OutboxEventStatus.PROCESSING, lockedAt: { lt: cutoff } }, data: { status: OutboxEventStatus.PENDING, lockedAt: null, availableAt: new Date() } });
    await this.prisma.notificationDelivery.updateMany({ where: { status: NotificationDeliveryStatus.PROCESSING, processingStartedAt: { lt: cutoff } }, data: { status: NotificationDeliveryStatus.PENDING, processingStartedAt: null, nextAttemptAt: new Date() } });
  }

  private async materializeAuditEvents() {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const events = await this.prisma.auditLog.findMany({
      where: { action: { in: [...EVENT_ACTIONS] }, entityId: { not: null }, createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
      take: 500,
    });
    if (!events.length) return;
    await this.prisma.outboxEvent.createMany({
      data: events.map((event) => ({
        eventId: event.id,
        sourceAuditLogId: event.id,
        eventType: event.action,
        aggregateType: event.entityType,
        aggregateId: event.entityId,
        payload: { action: event.action, entityType: event.entityType, entityId: event.entityId, metadata: event.metadata ?? {} },
      })),
      skipDuplicates: true,
    });
  }

  private async createPendingDeliveries() {
    const events = await this.prisma.outboxEvent.findMany({
      where: { status: { in: [OutboxEventStatus.PENDING, OutboxEventStatus.PROCESSING, OutboxEventStatus.FAILED] }, availableAt: { lte: new Date() } },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    for (const event of events) {
      const claimed = await this.prisma.outboxEvent.updateMany({
        where: { id: event.id, status: { in: [OutboxEventStatus.PENDING, OutboxEventStatus.FAILED] } },
        data: { status: OutboxEventStatus.PROCESSING, attempts: { increment: 1 }, lockedAt: new Date(), lastError: null },
      });
      if (!claimed.count && event.status !== OutboxEventStatus.PROCESSING) continue;
      const raw = event.payload as Record<string, unknown>;
      const action = String(raw.action ?? event.eventType);
      const metadata = raw.metadata && typeof raw.metadata === 'object' && !Array.isArray(raw.metadata) ? raw.metadata as Record<string, unknown> : {};
      const recipients = await this.resolveRecipients(event.aggregateType, event.aggregateId ?? '');
      const notification = this.toNotification(action, event.aggregateType, event.aggregateId ?? '', metadata);
      if (!notification) {
        await this.prisma.outboxEvent.update({ where: { id: event.id }, data: { status: OutboxEventStatus.PROCESSED, processedAt: new Date(), lockedAt: null } });
        continue;
      }
      if (!recipients.length) {
        await this.prisma.outboxEvent.update({ where: { id: event.id }, data: { status: OutboxEventStatus.PROCESSED, processedAt: new Date(), lockedAt: null } });
        continue;
      }
      const payload = { ...notification, eventId: event.eventId, sourceAuditLogId: event.sourceAuditLogId };
      await this.prisma.notificationDelivery.createMany({
        data: recipients.flatMap((recipientId) => [
          ...((await this.recipientChannels(recipientId)).map((channel) => ({ outboxEventId: event.id, recipientId, channel, notification: { create: { recipientId, channel, type: notification.type, title: notification.title, message: notification.message, metadata: notification.metadata } } }))),
        ]),
        skipDuplicates: true,
      });
      await this.prisma.outboxEvent.update({ where: { id: event.id }, data: { payload } });
    }
  }

  private async processDeliveries() {
    const deliveries = await this.prisma.notificationDelivery.findMany({ where: { status: { in: [NotificationDeliveryStatus.PENDING, NotificationDeliveryStatus.FAILED] }, nextAttemptAt: { lte: new Date() }, attempts: { lt: MAX_ATTEMPTS } }, orderBy: { createdAt: 'asc' }, take: 100, select: { id: true, status: true, attempts: true } });
    for (const delivery of deliveries) {
      const claimed = await this.prisma.notificationDelivery.updateMany({ where: { id: delivery.id, status: delivery.status, attempts: delivery.attempts }, data: { status: NotificationDeliveryStatus.PROCESSING, processingStartedAt: new Date(), attempts: { increment: 1 } } });
      if (!claimed.count) continue;
      try {
        await this.notifications.deliverDelivery(delivery.id);
      } catch (error) {
        const attempts = delivery.attempts + 1;
        await this.prisma.notificationDelivery.update({ where: { id: delivery.id }, data: { status: NotificationDeliveryStatus.FAILED, processingStartedAt: null, lastError: error instanceof Error ? error.message : String(error), nextAttemptAt: new Date(Date.now() + Math.min(60 * 60 * 1000, 30_000 * Math.pow(2, Math.max(0, attempts - 1)))) } });
        if (attempts >= MAX_ATTEMPTS) await this.prisma.notification.updateMany({ where: { id: delivery.id }, data: { status: 'FAILED' } });
      }
    }
  }

  private async reconcileOutbox() {
    const events = await this.prisma.outboxEvent.findMany({
      where: { status: { in: [OutboxEventStatus.PROCESSING, OutboxEventStatus.FAILED] } },
      take: 100,
      select: { id: true },
    });
    for (const event of events) {
      const deliveries = await this.prisma.notificationDelivery.findMany({ where: { outboxEventId: event.id }, select: { status: true, attempts: true } });
      if (!deliveries.length) {
        await this.prisma.outboxEvent.update({ where: { id: event.id }, data: { status: OutboxEventStatus.PROCESSED, processedAt: new Date(), lockedAt: null } });
        continue;
      }
      const hasPending = deliveries.some((d) => d.status === NotificationDeliveryStatus.PENDING || d.status === NotificationDeliveryStatus.PROCESSING || (d.status === NotificationDeliveryStatus.FAILED && d.attempts < MAX_ATTEMPTS));
      const hasTerminalFailure = deliveries.some((d) => d.status === NotificationDeliveryStatus.FAILED && d.attempts >= MAX_ATTEMPTS);
      const allSent = deliveries.every((d) => d.status === NotificationDeliveryStatus.SENT);
      if (allSent) await this.prisma.outboxEvent.update({ where: { id: event.id }, data: { status: OutboxEventStatus.PROCESSED, processedAt: new Date(), lockedAt: null } });
      else if (hasTerminalFailure && !hasPending) await this.prisma.outboxEvent.update({ where: { id: event.id }, data: { status: OutboxEventStatus.FAILED, lockedAt: null, lastError: 'One or more notification deliveries exhausted retry attempts' } });
      else if (hasPending) await this.prisma.outboxEvent.update({ where: { id: event.id }, data: { status: OutboxEventStatus.PROCESSING, lockedAt: null } });
    }
  }

  async summary() {
    const [outbox, deliveries, failedDeliveries, pendingDeliveries] = await Promise.all([
      this.prisma.outboxEvent.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.notificationDelivery.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.notificationDelivery.count({ where: { status: NotificationDeliveryStatus.FAILED } }),
      this.prisma.notificationDelivery.count({ where: { status: NotificationDeliveryStatus.PENDING } }),
    ]);
    return { outbox, deliveries, failedDeliveries, pendingDeliveries };
  }

  async listOutbox(limit = 100) {
    return this.prisma.outboxEvent.findMany({ orderBy: { createdAt: 'desc' }, take: Math.min(Math.max(limit, 1), 500), include: { deliveries: { select: { id: true, channel: true, status: true, attempts: true, nextAttemptAt: true, lastError: true, sentAt: true } } } });
  }

  async listDeliveryFailures(limit = 100) {
    return this.prisma.notificationDelivery.findMany({ where: { status: NotificationDeliveryStatus.FAILED }, orderBy: { updatedAt: 'desc' }, take: Math.min(Math.max(limit, 1), 500), include: { outboxEvent: { select: { eventId: true, eventType: true, aggregateType: true, aggregateId: true } }, recipient: { select: { id: true, email: true, phone: true } } } });
  }


  private async recipientChannels(recipientId: string): Promise<NotificationChannel[]> {
    const user = await this.prisma.user.findUnique({ where: { id: recipientId }, select: { email: true, phone: true } });
    return [NotificationChannel.IN_APP, ...(user?.email ? [NotificationChannel.EMAIL] : []), ...(user?.phone ? [NotificationChannel.SMS] : [])];
  }

  private async resolveRecipients(entityType: string, entityId: string): Promise<string[]> {
    if (!entityId) return [];
    if (entityType === 'Registration') {
      const registration = await this.prisma.registration.findUnique({ where: { id: entityId }, select: { phone: true } });
      if (!registration?.phone) return [];
      const user = await this.prisma.user.findFirst({ where: { status: 'ACTIVE', phone: registration.phone }, select: { id: true } });
      return user ? [user.id] : [];
    }
    if (entityType === 'InstitutionApplication') {
      const application = await this.prisma.institutionApplication.findUnique({ where: { id: entityId }, select: { applicantEmail: true, applicantPhone: true, institutionId: true } });
      if (!application) return [];
      if (application.institutionId) return this.institutionRecipients(application.institutionId);
      const user = await this.prisma.user.findFirst({ where: { status: 'ACTIVE', OR: [...(application.applicantEmail ? [{ email: application.applicantEmail }] : []), ...(application.applicantPhone ? [{ phone: application.applicantPhone }] : [])] }, select: { id: true } });
      return user ? [user.id] : [];
    }
    if (entityType === 'License') {
      const license = await this.prisma.license.findUnique({ where: { id: entityId }, select: { institutionId: true } });
      return license ? this.institutionRecipients(license.institutionId) : [];
    }
    if (entityType === 'MemberInstitution') {
      const membership = await this.prisma.memberInstitution.findUnique({ where: { id: entityId }, select: { institutionId: true, memberId: true } });
      if (!membership) return [];
      const recipients = await this.institutionRecipients(membership.institutionId);
      const member = await this.prisma.member.findUnique({ where: { id: membership.memberId }, select: { phone: true } });
      if (member?.phone) { const memberUser = await this.prisma.user.findFirst({ where: { phone: member.phone, status: 'ACTIVE' }, select: { id: true } }); if (memberUser) recipients.push(memberUser.id); }
      return [...new Set(recipients)];
    }
    if (entityType === 'Credential') {
      const credential = await this.prisma.credential.findUnique({ where: { id: entityId }, select: { institutionId: true, member: { select: { phone: true } }, license: { select: { institutionId: true } } } });
      if (!credential) return [];
      const recipients = credential.institutionId || credential.license?.institutionId ? await this.institutionRecipients(credential.institutionId ?? credential.license!.institutionId) : [];
      if (credential.member?.phone) { const memberUser = await this.prisma.user.findFirst({ where: { phone: credential.member.phone, status: 'ACTIVE' }, select: { id: true } }); if (memberUser) recipients.push(memberUser.id); }
      return [...new Set(recipients)];
    }
    return [];
  }

  private async institutionRecipients(institutionId: string) {
    const users = await this.prisma.user.findMany({ where: { institutionId, status: 'ACTIVE' }, select: { id: true } });
    return users.map((user) => user.id);
  }

  private toNotification(action: string, entityType: string, entityId: string, metadata: unknown) {
    const values = metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata as Record<string, unknown> : {};
    const reason = typeof values.reason === 'string' ? values.reason : '';
    switch (action) {
      case 'REGISTRATION_SUBMITTED': return { type: 'REGISTRATION_SUBMITTED', title: 'Registration submitted', message: 'Application ' + String(values.trackingCode ?? entityId) + ' has been submitted successfully.', metadata: { ...values, trackingCode: values.trackingCode ?? entityId } };
      case 'REGISTRATION_RESUBMITTED': return { type: 'CORRECTION_REQUIRED', title: 'Registration resubmitted', message: 'Application ' + String(values.trackingCode ?? entityId) + ' was resubmitted for review.', metadata: { ...values, trackingCode: values.trackingCode ?? entityId } };
      case 'INSTITUTION_APPLICATION_SUBMITTED': case 'INSTITUTION_APPLICATION_RESUBMITTED': return { type: 'REGISTRATION_SUBMITTED', title: 'Institution application submitted', message: 'Institution application ' + String(values.trackingCode ?? entityId) + ' has been submitted.', metadata: { ...values, trackingCode: values.trackingCode ?? entityId } };
      case 'LICENSE_APPLICATION_CREATED': return { type: 'LICENSE_APPLICATION_SUBMITTED', title: 'License application submitted', message: 'License application ' + entityId + ' has been submitted.', metadata: { ...values, licenseNumber: values.licenseNumber ?? entityId } };
      case 'LICENSE_APPLICATION_REVIEWED': return { type: 'APPLICATION_STATUS', title: 'License application under review', message: 'Your license application is now under review.', metadata: { ...values, status: 'UNDER_REVIEW', licenseNumber: values.licenseNumber ?? entityId } };
      case 'LICENSE_CORRECTION_REQUESTED': return { type: 'LICENSE_CORRECTION_REQUIRED', title: 'License correction required', message: 'Correction is required for license application ' + entityId + ': ' + reason, metadata: { ...values, licenseNumber: values.licenseNumber ?? entityId, reason } };
      case 'LICENSE_APPROVED': return { type: 'LICENSE_APPROVED', title: 'License application approved', message: 'License application ' + entityId + ' has been approved.', metadata: { ...values, licenseNumber: values.licenseNumber ?? entityId } };
      case 'LICENSE_REJECTED': return { type: 'LICENSE_REJECTED', title: 'License application rejected', message: 'License application ' + entityId + ' was rejected: ' + reason, metadata: { ...values, licenseNumber: values.licenseNumber ?? entityId, reason } };
      case 'LICENSE_RESUBMITTED': return { type: 'RENEWAL', title: 'License application resubmitted', message: 'License application ' + entityId + ' was resubmitted for review.', metadata: { ...values, licenseNumber: values.licenseNumber ?? entityId } };
      case 'LICENSE_ISSUED': return { type: 'CREDENTIAL_ISSUED', title: 'License issued', message: 'License ' + String(values.licenseNumber ?? entityId) + ' has been issued.', metadata: { ...values, licenseNumber: values.licenseNumber ?? entityId } };
      case 'LICENSE_EXPIRED': return { type: 'LICENSE_EXPIRY', title: 'License expired', message: 'License ' + String(values.licenseNumber ?? entityId) + ' has expired.', metadata: { ...values, licenseNumber: values.licenseNumber ?? entityId } };
      case 'MEMBERSHIP_REQUESTED': case 'MEMBERSHIP_ACTIVE': case 'MEMBERSHIP_SUSPENDED': case 'MEMBERSHIP_ENDED': { const status = action === 'MEMBERSHIP_ACTIVE' ? 'ACTIVE' : action === 'MEMBERSHIP_SUSPENDED' ? 'SUSPENDED' : action === 'MEMBERSHIP_ENDED' ? 'ENDED' : 'PENDING'; const type = status === 'ACTIVE' ? 'MEMBERSHIP_APPROVED' : status === 'SUSPENDED' ? 'MEMBERSHIP_SUSPENDED' : status === 'ENDED' ? 'MEMBERSHIP_ENDED' : 'MEMBERSHIP_REQUESTED'; return { type, title: 'Membership ' + status.toLowerCase(), message: 'Institutional membership status changed to ' + status.toLowerCase() + (reason ? '. ' + reason : '.'), metadata: { ...values, memberName: values.memberName ?? entityId, reason } }; }
      case 'CREDENTIAL_ISSUED': case 'CREDENTIAL_PUBLISHED': return { type: 'CREDENTIAL_ISSUED', title: 'Credential issued', message: 'Credential ' + String(values.credentialNumber ?? entityId) + ' is now available.', metadata: { ...values, credentialNumber: values.credentialNumber ?? entityId } };
      default: return null;
    }
  }
}
