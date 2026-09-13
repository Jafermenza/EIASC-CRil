import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { NotificationChannel } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from './notifications.service';

const EVENT_ACTIONS = ['REGISTRATION_SUBMITTED','REGISTRATION_RESUBMITTED','LICENSE_APPLICATION_CREATED','LICENSE_APPLICATION_REVIEWED','LICENSE_CORRECTION_REQUESTED','LICENSE_APPROVED','LICENSE_REJECTED','LICENSE_RESUBMITTED','LICENSE_ISSUED','LICENSE_EXPIRED','MEMBERSHIP_CREATED','MEMBERSHIP_STATUS_CHANGED','CREDENTIAL_PUBLISHED'] as const;

@Injectable()
export class NotificationDispatcherService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}
  onModuleInit() { void this.process(); this.timer = setInterval(() => void this.process(), 15_000); }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
  async process() {
    if (this.running) return;
    this.running = true;
    try {
      const since = new Date(Date.now() - 10 * 60 * 1000);
      const events = await this.prisma.auditLog.findMany({ where: { action: { in: [...EVENT_ACTIONS] }, createdAt: { gte: since } }, orderBy: { createdAt: 'asc' }, take: 100 });
      for (const event of events) {
        const sourceAuditLogId = event.id;
        if (!event.entityId) continue;
        const existing = await this.prisma.notification.findFirst({ where: { metadata: { path: ['sourceAuditLogId'], equals: sourceAuditLogId } }, select: { id: true } });
        if (existing) continue;
        const recipients = await this.resolveRecipients(event.entityType, event.entityId);
        if (!recipients.length) continue;
        const notification = this.toNotification(event.action, event.entityType, event.entityId, event.metadata);
        if (!notification) continue;
        await Promise.all(recipients.flatMap((recipientId) => [
          this.notifications.notifyEvent(recipientId, { ...notification, metadata: { ...notification.metadata, sourceAuditLogId } }),
          this.notifications.notifyEvent(recipientId, { ...notification, metadata: { ...notification.metadata, sourceAuditLogId } }, NotificationChannel.EMAIL),
          this.notifications.notifyEvent(recipientId, { ...notification, metadata: { ...notification.metadata, sourceAuditLogId } }, NotificationChannel.SMS),
        ]));
      }
    } finally { this.running = false; }
  }
  private async resolveRecipients(entityType: string, entityId: string): Promise<string[]> {
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
  private async institutionRecipients(institutionId: string) { const users = await this.prisma.user.findMany({ where: { institutionId, status: 'ACTIVE' }, select: { id: true } }); return users.map((user) => user.id); }
  private toNotification(action: string, entityType: string, entityId: string, metadata: unknown) {
    const values = metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata as Record<string, unknown> : {};
    const reason = typeof values.reason === 'string' ? values.reason : '';
    switch (action) {
      case 'REGISTRATION_SUBMITTED': return { type: 'REGISTRATION_SUBMITTED', title: 'Registration submitted', message: `Application ${String(values.trackingCode ?? entityId)} has been submitted successfully.`, metadata: { ...values, trackingCode: values.trackingCode ?? entityId } };
      case 'REGISTRATION_RESUBMITTED': return { type: 'CORRECTION_REQUIRED', title: 'Registration resubmitted', message: `Application ${String(values.trackingCode ?? entityId)} was resubmitted for review.`, metadata: { ...values, trackingCode: values.trackingCode ?? entityId } };
      case 'LICENSE_APPLICATION_CREATED': return { type: 'LICENSE_APPLICATION_SUBMITTED', title: 'License application submitted', message: `License application ${entityId} has been submitted.`, metadata: { ...values, licenseNumber: values.licenseNumber ?? entityId } };
      case 'LICENSE_APPLICATION_REVIEWED': return { type: 'APPLICATION_STATUS', title: 'License application under review', message: 'Your license application is now under review.', metadata: { ...values, status: 'UNDER_REVIEW', licenseNumber: values.licenseNumber ?? entityId } };
      case 'LICENSE_CORRECTION_REQUESTED': return { type: 'LICENSE_CORRECTION_REQUIRED', title: 'License correction required', message: `Correction is required for license application ${entityId}: ${reason}`, metadata: { ...values, licenseNumber: values.licenseNumber ?? entityId, reason } };
      case 'LICENSE_APPROVED': return { type: 'LICENSE_APPROVED', title: 'License application approved', message: `License application ${entityId} has been approved.`, metadata: { ...values, licenseNumber: values.licenseNumber ?? entityId } };
      case 'LICENSE_REJECTED': return { type: 'LICENSE_REJECTED', title: 'License application rejected', message: `License application ${entityId} was rejected: ${reason}`, metadata: { ...values, licenseNumber: values.licenseNumber ?? entityId, reason } };
      case 'LICENSE_RESUBMITTED': return { type: 'RENEWAL', title: 'License application resubmitted', message: `License application ${entityId} was resubmitted for review.`, metadata: { ...values, licenseNumber: values.licenseNumber ?? entityId } };
      case 'LICENSE_ISSUED': return { type: 'CREDENTIAL_ISSUED', title: 'License issued', message: `License ${String(values.licenseNumber ?? entityId)} has been issued.`, metadata: { ...values, licenseNumber: values.licenseNumber ?? entityId } };
      case 'LICENSE_EXPIRED': return { type: 'LICENSE_EXPIRY', title: 'License expired', message: `License ${String(values.licenseNumber ?? entityId)} has expired.`, metadata: { ...values, licenseNumber: values.licenseNumber ?? entityId } };
      case 'MEMBERSHIP_CREATED': return { type: 'MEMBERSHIP_REQUESTED', title: 'Membership request created', message: 'A new institutional membership relationship has been created.', metadata: { ...values } };
      case 'MEMBERSHIP_STATUS_CHANGED': { const status = String(values.toStatus ?? 'UPDATED'); const type = status === 'ACTIVE' ? 'MEMBERSHIP_APPROVED' : status === 'SUSPENDED' ? 'MEMBERSHIP_SUSPENDED' : status === 'ENDED' ? 'MEMBERSHIP_ENDED' : 'MEMBERSHIP_REQUESTED'; return { type, title: `Membership ${status.toLowerCase()}`, message: `Institutional membership status changed to ${status.toLowerCase()}${reason ? `. ${reason}` : '.'}`, metadata: { ...values, memberName: values.memberName ?? entityId, reason } }; }
      case 'CREDENTIAL_PUBLISHED': return { type: 'CREDENTIAL_ISSUED', title: 'Credential published', message: `Credential ${String(values.credentialNumber ?? entityId)} is now publicly verified.`, metadata: { ...values, credentialNumber: values.credentialNumber ?? entityId } };
      default: return null;
    }
  }
}
