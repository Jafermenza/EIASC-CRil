import { ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { NotificationChannel, NotificationStatus, Prisma, RoleCode } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma.service';

export type NotificationEvent = { type: string; title: string; message: string; metadata?: Record<string, unknown> };

interface NotificationProvider { send(input: { to: string; subject: string; message: string }): Promise<void>; }

class ResendEmailProvider implements NotificationProvider {
  constructor(private readonly apiKey: string, private readonly from: string) {}
  async send(input: { to: string; subject: string; message: string }) {
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' }, body: JSON.stringify({ from: this.from, to: [input.to], subject: input.subject, text: input.message }) });
    if (!response.ok) throw new Error(`Resend email delivery failed with HTTP ${response.status}`);
  }
}

class AfroMessageSmsProvider implements NotificationProvider {
  constructor(private readonly token: string, private readonly identifierId: string, private readonly sender: string, private readonly callback?: string) {}
  async send(input: { to: string; subject: string; message: string }) {
    const response = await fetch('https://api.afromessage.com/api/send', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ from: this.identifierId, sender: this.sender, to: input.to, message: input.message, ...(this.callback ? { callback: this.callback } : {}) }) });
    const body = await response.json().catch(() => null) as { acknowledge?: string; message?: string } | null;
    if (!response.ok || body?.acknowledge !== 'success') throw new Error(`AfroMessage SMS delivery failed with HTTP ${response.status}${body?.message ? `: ${body.message}` : ''}`);
  }
}

const MANAGE_ROLES = new Set<RoleCode>([RoleCode.SUPER_ADMIN]);
const DEFAULT_TEMPLATES: Record<string, string> = {
  CREDENTIAL_ISSUED: 'EIASC: Your {{type}} credential {{credentialNumber}} has been issued. Verify: {{verificationUrl}}',
  CREDENTIAL_PUBLISHED: 'EIASC: Your {{type}} credential {{credentialNumber}} is now publicly verified. Verify: {{verificationUrl}}',
  APPLICATION_STATUS: 'EIASC: Your application {{trackingCode}} status is {{status}}.'
};

@Injectable()
export class NotificationsService {
  private readonly emailProvider: NotificationProvider | null;
  private readonly smsProvider: NotificationProvider | null;
  constructor(private readonly prisma: PrismaService) {
    const emailKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.RESEND_FROM_EMAIL;
    this.emailProvider = emailKey && emailFrom ? new ResendEmailProvider(emailKey, emailFrom) : null;
    const smsToken = process.env.AFRO_MESSAGE_TOKEN;
    const smsIdentifier = process.env.AFRO_MESSAGE_IDENTIFIER_ID;
    const smsSender = process.env.AFRO_MESSAGE_SENDER_NAME;
    const smsCallback = process.env.AFRO_MESSAGE_STATUS_CALLBACK;
    this.smsProvider = smsToken && smsIdentifier && smsSender ? new AfroMessageSmsProvider(smsToken, smsIdentifier, smsSender, smsCallback) : null;
  }

  private async setting(key: string): Promise<string | null> {
    const rows = await this.prisma.$queryRaw<Array<{ value: string | null }>>`SELECT "value" FROM "PlatformSetting" WHERE "key"=${key} LIMIT 1`;
    return rows[0]?.value ?? null;
  }

  private async setSetting(key: string, value: string | null) {
    await this.prisma.$executeRaw`INSERT INTO "PlatformSetting" ("key","value","updatedAt") VALUES (${key},${value},CURRENT_TIMESTAMP) ON CONFLICT ("key") DO UPDATE SET "value"=EXCLUDED."value", "updatedAt"=CURRENT_TIMESTAMP`;
  }

  private async smsEnabled() { return (await this.setting('NOTIFICATIONS_SMS_ENABLED')) !== 'false'; }

  private async templates(): Promise<Record<string, string>> {
    const raw = await this.setting('NOTIFICATIONS_SMS_TEMPLATES');
    if (!raw) return { ...DEFAULT_TEMPLATES };
    try { return { ...DEFAULT_TEMPLATES, ...(JSON.parse(raw) as Record<string, string>) }; } catch { return { ...DEFAULT_TEMPLATES }; }
  }

  private render(template: string, event: NotificationEvent) {
    const values: Record<string, string> = { ...(event.metadata ?? {}) as Record<string, string> };
    return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key: string) => values[key] ?? '');
  }

  async getAdminSettings(roles: RoleCode[]) {
    if (!roles.some((role) => MANAGE_ROLES.has(role))) throw new ForbiddenException('Super Admin permission required');
    const smsConfigured = Boolean(this.smsProvider);
    const enabled = await this.smsEnabled();
    return {
      sms: { configured: smsConfigured, enabled: smsConfigured && enabled, senderConfigured: Boolean(process.env.AFRO_MESSAGE_SENDER_NAME), callbackConfigured: Boolean(process.env.AFRO_MESSAGE_STATUS_CALLBACK) },
      email: { configured: Boolean(this.emailProvider) },
      templates: await this.templates(),
      templateVariables: ['type', 'credentialNumber', 'verificationUrl', 'trackingCode', 'status', 'recipientName']
    };
  }

  async updateAdminSettings(roles: RoleCode[], input: { smsEnabled?: boolean; templates?: Record<string, string> }) {
    if (!roles.some((role) => MANAGE_ROLES.has(role))) throw new ForbiddenException('Super Admin permission required');
    if (input.smsEnabled !== undefined) await this.setSetting('NOTIFICATIONS_SMS_ENABLED', String(input.smsEnabled));
    if (input.templates !== undefined) {
      for (const [key, value] of Object.entries(input.templates)) {
        if (!(key in DEFAULT_TEMPLATES) || typeof value !== 'string' || value.length > 320) throw new Error(`Invalid SMS template: ${key}`);
      }
      await this.setSetting('NOTIFICATIONS_SMS_TEMPLATES', JSON.stringify({ ...DEFAULT_TEMPLATES, ...input.templates }));
    }
    return this.getAdminSettings(roles);
  }

  async create(recipientId: string, input: NotificationEvent & { channel?: NotificationChannel }) {
    const recipient = await this.prisma.user.findUnique({ where: { id: recipientId }, select: { email: true, phone: true } });
    const notification = await this.prisma.notification.create({ data: { recipientId, type: input.type, title: input.title, message: input.message, channel: input.channel ?? NotificationChannel.IN_APP, metadata: input.metadata as Prisma.InputJsonValue | undefined } });
    if (notification.channel === NotificationChannel.IN_APP) return this.prisma.notification.update({ where: { id: notification.id }, data: { status: NotificationStatus.SENT, sentAt: new Date() } });
    if (notification.channel === NotificationChannel.EMAIL && this.emailProvider && recipient?.email) {
      try { await this.emailProvider.send({ to: recipient.email, subject: notification.title, message: notification.message }); return this.prisma.notification.update({ where: { id: notification.id }, data: { status: NotificationStatus.SENT, sentAt: new Date() } }); }
      catch (error) { return this.prisma.notification.update({ where: { id: notification.id }, data: { status: NotificationStatus.FAILED, metadata: { ...(input.metadata ?? {}), deliveryError: error instanceof Error ? error.message : 'Email delivery failed' } as Prisma.InputJsonValue } }); }
    }
    if (notification.channel === NotificationChannel.SMS && this.smsProvider && recipient?.phone && await this.smsEnabled()) {
      try { const configuredTemplates = await this.templates(); const template = configuredTemplates[input.type]; const message = template ? this.render(template, input) : notification.message; await this.smsProvider.send({ to: recipient.phone, subject: notification.title, message }); return this.prisma.notification.update({ where: { id: notification.id }, data: { status: NotificationStatus.SENT, sentAt: new Date() } }); }
      catch (error) { return this.prisma.notification.update({ where: { id: notification.id }, data: { status: NotificationStatus.FAILED, metadata: { ...(input.metadata ?? {}), deliveryError: error instanceof Error ? error.message : 'SMS delivery failed' } as Prisma.InputJsonValue } }); }
    }
    return notification;
  }

  async testEmail(user: AuthenticatedUser) {
    if (!this.emailProvider) throw new ServiceUnavailableException('Resend email provider is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.');
    const recipient = await this.prisma.user.findUnique({ where: { id: user.id }, select: { email: true } });
    if (!recipient?.email) throw new ServiceUnavailableException('The authenticated user does not have an email address.');
    const notification = await this.create(user.id, { type: 'EMAIL_PROVIDER_TEST', title: 'EIASC CRil email delivery test', message: 'This is a live production email delivery test from EIASC CRil.', channel: NotificationChannel.EMAIL });
    if (notification.status !== NotificationStatus.SENT) throw new ServiceUnavailableException('Resend rejected or failed the test delivery. Check notification delivery metadata.');
    return { delivered: true, notificationId: notification.id, recipient: recipient.email };
  }

  async testSms(user: AuthenticatedUser) {
    if (!this.smsProvider) throw new ServiceUnavailableException('AfroMessage SMS provider is not configured. Set AFRO_MESSAGE_TOKEN, AFRO_MESSAGE_IDENTIFIER_ID and AFRO_MESSAGE_SENDER_NAME.');
    if (!(await this.smsEnabled())) throw new ServiceUnavailableException('SMS notifications are disabled in platform settings.');
    const recipient = await this.prisma.user.findUnique({ where: { id: user.id }, select: { phone: true } });
    if (!recipient?.phone) throw new ServiceUnavailableException('The authenticated user does not have a phone number.');
    const notification = await this.create(user.id, { type: 'SMS_PROVIDER_TEST', title: 'EIASC CRil SMS delivery test', message: 'This is a live production SMS delivery test from EIASC CRil.', channel: NotificationChannel.SMS, metadata: { recipientName: 'Administrator' } });
    if (notification.status !== NotificationStatus.SENT) throw new ServiceUnavailableException('AfroMessage rejected or failed the test delivery. Check notification delivery metadata.');
    return { delivered: true, notificationId: notification.id, recipient: recipient.phone };
  }

  async notifyEvent(recipientId: string, event: NotificationEvent, channel: NotificationChannel = NotificationChannel.IN_APP) { return this.create(recipientId, { ...event, channel }); }
  async list(user: AuthenticatedUser, unreadOnly = false) { return this.prisma.notification.findMany({ where: { recipientId: user.id, ...(unreadOnly ? { readAt: null } : {}) }, orderBy: { createdAt: 'desc' }, take: 100 }); }
  async markRead(user: AuthenticatedUser, id: string) { const notification = await this.prisma.notification.findFirst({ where: { id, recipientId: user.id } }); if (!notification) throw new NotFoundException('Notification not found'); return this.prisma.notification.update({ where: { id }, data: { readAt: new Date(), status: NotificationStatus.READ } }); }
}
