import { ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { NotificationChannel, NotificationDeliveryStatus, NotificationStatus, Prisma, RoleCode } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma.service';
import { DEFAULT_EVENT_TOGGLES, NotificationEventType } from './notification-events';
export type NotificationEvent = { type: string; title: string; message: string; metadata?: Record<string, unknown> };
interface NotificationProvider { send(input: { to: string; subject: string; message: string; idempotencyKey?: string }): Promise<void>; }
class ResendEmailProvider implements NotificationProvider { constructor(private readonly apiKey: string, private readonly from: string) {} async send(input: { to: string; subject: string; message: string; idempotencyKey?: string }) { const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json', ...(input.idempotencyKey ? { 'Idempotency-Key': input.idempotencyKey } : {}) }, body: JSON.stringify({ from: this.from, to: [input.to], subject: input.subject, text: input.message }) }); if (!response.ok) throw new Error(`Resend email delivery failed with HTTP ${response.status}`); } }
class AfroMessageSmsProvider implements NotificationProvider { constructor(private readonly token: string, private readonly identifierId: string, private readonly sender: string, private readonly callback?: string) {} async send(input: { to: string; subject: string; message: string; idempotencyKey?: string }) { const response = await fetch('https://api.afromessage.com/api/send', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ from: this.identifierId, sender: this.sender, to: input.to, message: input.message, ...(this.callback ? { callback: this.callback } : {}) }) }); const body = await response.json().catch(() => null) as { acknowledge?: string; message?: string } | null; if (!response.ok || body?.acknowledge !== 'success') throw new Error(`AfroMessage SMS delivery failed with HTTP ${response.status}${body?.message ? `: ${body.message}` : ''}`); } }
const MANAGE_ROLES = new Set<RoleCode>([RoleCode.SUPER_ADMIN]);
const DEFAULT_TEMPLATES: Record<string, string> = { CREDENTIAL_ISSUED: 'EIASC: Your {{type}} credential {{credentialNumber}} has been issued. Verify: {{verificationUrl}}', CREDENTIAL_EXPIRY: 'EIASC: Your {{type}} credential {{credentialNumber}} expires in {{daysToExpiry}} day(s).', LICENSE_EXPIRY: 'EIASC: License {{licenseNumber}} expires in {{daysToExpiry}} day(s).', REGISTRATION_SUBMITTED: 'EIASC: Application {{trackingCode}} has been submitted successfully.', TRACKING_ID_CREATED: 'EIASC: Your application tracking ID is {{trackingCode}}.', REGISTRATION_APPROVED: 'EIASC: Application {{trackingCode}} has been approved.', REGISTRATION_REJECTED: 'EIASC: Application {{trackingCode}} was rejected: {{reason}}', CORRECTION_REQUIRED: 'EIASC: Correction is required for application {{trackingCode}}: {{reason}}', RENEWAL: 'EIASC: Renewal is available for {{type}} {{credentialNumber}}.', LICENSE_APPLICATION_SUBMITTED: 'EIASC: License application {{licenseNumber}} has been submitted.', LICENSE_APPROVED: 'EIASC: License application {{licenseNumber}} has been approved.', LICENSE_REJECTED: 'EIASC: License application {{licenseNumber}} was rejected: {{reason}}', LICENSE_CORRECTION_REQUIRED: 'EIASC: Correction is required for license application {{licenseNumber}}: {{reason}}', MEMBERSHIP_REQUESTED: 'EIASC: A membership request was created for {{memberName}}.', MEMBERSHIP_APPROVED: 'EIASC: Membership for {{memberName}} is now active.', MEMBERSHIP_SUSPENDED: 'EIASC: Membership for {{memberName}} has been suspended: {{reason}}', MEMBERSHIP_ENDED: 'EIASC: Membership for {{memberName}} has ended: {{reason}}' };
function isConfigured(value: string | undefined) { return Boolean(value && !/(x{3,}|your-verified-domain|replace-with)/i.test(value)); }
@Injectable()
export class NotificationsService {
  private readonly emailProvider: NotificationProvider | null;
  private readonly smsProvider: NotificationProvider | null;
  constructor(private readonly prisma: PrismaService) { const emailKey = process.env.RESEND_API_KEY; const emailFrom = process.env.RESEND_FROM_EMAIL; this.emailProvider = isConfigured(emailKey) && isConfigured(emailFrom) ? new ResendEmailProvider(emailKey!, emailFrom!) : null; const smsToken = process.env.AFRO_MESSAGE_TOKEN; const smsIdentifier = process.env.AFRO_MESSAGE_IDENTIFIER_ID; const smsSender = process.env.AFRO_MESSAGE_SENDER_NAME; const smsCallback = process.env.AFRO_MESSAGE_STATUS_CALLBACK; this.smsProvider = smsToken && smsIdentifier && smsSender ? new AfroMessageSmsProvider(smsToken, smsIdentifier, smsSender, smsCallback) : null; }
  private async setting(key: string): Promise<string | null> { const rows = await this.prisma.$queryRaw<Array<{ value: string | null }>>`SELECT "value" FROM "PlatformSetting" WHERE "key"=${key} LIMIT 1`; return rows[0]?.value ?? null; }
  private async setSetting(key: string, value: string | null) { await this.prisma.$executeRaw`INSERT INTO "PlatformSetting" ("key","value","updatedAt") VALUES (${key},${value},CURRENT_TIMESTAMP) ON CONFLICT ("key") DO UPDATE SET "value"=EXCLUDED."value", "updatedAt"=CURRENT_TIMESTAMP`; }
  private async smsEnabled() { return (await this.setting('NOTIFICATIONS_SMS_ENABLED')) !== 'false'; }
  private async eventToggles(): Promise<Record<NotificationEventType, boolean>> { const raw = await this.setting('NOTIFICATIONS_EVENT_TOGGLES'); if (!raw) return { ...DEFAULT_EVENT_TOGGLES }; try { const parsed = JSON.parse(raw) as Record<string, unknown>; return Object.fromEntries(Object.entries(DEFAULT_EVENT_TOGGLES).map(([key, defaultValue]) => [key, typeof parsed[key] === 'boolean' ? parsed[key] : defaultValue])) as Record<NotificationEventType, boolean>; } catch { return { ...DEFAULT_EVENT_TOGGLES }; } }
  private async eventEnabled(type: string) { const toggles = await this.eventToggles(); return toggles[type as NotificationEventType] !== false; }
  private async templates(): Promise<Record<string, string>> { const raw = await this.setting('NOTIFICATIONS_TEMPLATES'); if (!raw) return { ...DEFAULT_TEMPLATES }; try { return { ...DEFAULT_TEMPLATES, ...(JSON.parse(raw) as Record<string, string>) }; } catch { return { ...DEFAULT_TEMPLATES }; } }
  private render(template: string, event: NotificationEvent) { const values = Object.fromEntries(Object.entries(event.metadata ?? {}).map(([key, value]) => [key, String(value)])) as Record<string, string>; return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key: string) => values[key] ?? ''); }
  async getAdminSettings(roles: RoleCode[]) { if (!roles.some((role) => MANAGE_ROLES.has(role))) throw new ForbiddenException('Super Admin permission required'); return { sms: { configured: Boolean(this.smsProvider), enabled: Boolean(this.smsProvider) && await this.smsEnabled(), senderConfigured: Boolean(process.env.AFRO_MESSAGE_SENDER_NAME), callbackConfigured: Boolean(process.env.AFRO_MESSAGE_STATUS_CALLBACK) }, email: { configured: Boolean(this.emailProvider), senderConfigured: Boolean(process.env.RESEND_FROM_EMAIL) }, templates: await this.templates(), eventToggles: await this.eventToggles(), templateVariables: ['type','credentialNumber','verificationUrl','trackingCode','status','recipientName','reason','licenseNumber','daysToExpiry','memberName'] }; }
  async updateAdminSettings(roles: RoleCode[], input: { smsEnabled?: boolean; eventToggles?: Partial<Record<NotificationEventType, boolean>>; templates?: Record<string, string> }) { if (!roles.some((role) => MANAGE_ROLES.has(role))) throw new ForbiddenException('Super Admin permission required'); if (input.smsEnabled !== undefined) await this.setSetting('NOTIFICATIONS_SMS_ENABLED', String(input.smsEnabled)); if (input.eventToggles !== undefined) { const current = await this.eventToggles(); for (const [key,value] of Object.entries(input.eventToggles)) if (!(key in DEFAULT_EVENT_TOGGLES) || typeof value !== 'boolean') throw new Error(`Invalid notification event toggle: ${key}`); await this.setSetting('NOTIFICATIONS_EVENT_TOGGLES', JSON.stringify({ ...current, ...input.eventToggles })); } if (input.templates !== undefined) { for (const [key,value] of Object.entries(input.templates)) if (!(key in DEFAULT_TEMPLATES) || typeof value !== 'string' || value.length > 320) throw new Error(`Invalid notification template: ${key}`); await this.setSetting('NOTIFICATIONS_TEMPLATES', JSON.stringify({ ...(await this.templates()), ...input.templates })); } return this.getAdminSettings(roles); }
  async create(recipientId: string, input: NotificationEvent & { channel?: NotificationChannel }) { if (!(await this.eventEnabled(input.type))) return null; const recipient = await this.prisma.user.findUnique({ where: { id: recipientId }, select: { email: true, phone: true } }); const channel = input.channel ?? NotificationChannel.IN_APP; const configured = channel === NotificationChannel.IN_APP || (channel === NotificationChannel.EMAIL ? Boolean(this.emailProvider && recipient?.email) : Boolean(this.smsProvider && recipient?.phone && await this.smsEnabled())); const notification = await this.prisma.notification.create({ data: { recipientId, type: input.type, title: input.title, message: input.message, channel, metadata: input.metadata as Prisma.InputJsonValue | undefined } }); if (!configured) return notification; if (channel === NotificationChannel.IN_APP) return this.prisma.notification.update({ where: { id: notification.id }, data: { status: NotificationStatus.SENT, sentAt: new Date() } }); try { const message = channel === NotificationChannel.SMS ? this.render((await this.templates())[input.type] ?? input.message, input) : input.message; const provider = channel === NotificationChannel.EMAIL ? this.emailProvider : this.smsProvider; if (!provider) return notification; await provider.send({ to: channel === NotificationChannel.EMAIL ? recipient!.email! : recipient!.phone!, subject: notification.title, message }); return this.prisma.notification.update({ where: { id: notification.id }, data: { status: NotificationStatus.SENT, sentAt: new Date() } }); } catch (error) { return this.prisma.notification.update({ where: { id: notification.id }, data: { status: NotificationStatus.FAILED, metadata: { ...(input.metadata ?? {}), deliveryError: error instanceof Error ? error.message : 'Notification delivery failed' } as Prisma.InputJsonValue } }); } }

  async deliverDelivery(deliveryId: string) {
    const delivery = await this.prisma.notificationDelivery.findUnique({
      where: { id: deliveryId },
      include: { notification: true, recipient: { select: { email: true, phone: true } } },
    });
    if (!delivery) throw new NotFoundException('Notification delivery not found');

    const eventMetadata = delivery.notification?.metadata;
    const metadata = eventMetadata && typeof eventMetadata === 'object' && !Array.isArray(eventMetadata)
      ? eventMetadata as Record<string, unknown>
      : {};
    const notification = delivery.notification ?? await this.prisma.notification.create({
      data: {
        recipientId: delivery.recipientId,
        channel: delivery.channel,
        type: String(metadata.type ?? 'BUSINESS_EVENT'),
        title: String(metadata.title ?? 'EIASC CRil notification'),
        message: String(metadata.message ?? 'You have a new notification.'),
        status: NotificationStatus.PENDING,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });

    if (delivery.channel === NotificationChannel.IN_APP) {
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { status: NotificationStatus.SENT, sentAt: new Date() },
      });
      await this.prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: { notificationId: notification.id, status: NotificationDeliveryStatus.SENT, sentAt: new Date(), processingStartedAt: null, lastError: null },
      });
      return;
    }

    const recipient = delivery.channel === NotificationChannel.EMAIL ? delivery.recipient.email : delivery.recipient.phone;
    const provider = delivery.channel === NotificationChannel.EMAIL ? this.emailProvider : this.smsProvider;
    if (!recipient || !provider) {
      throw new Error(delivery.channel === NotificationChannel.EMAIL
        ? 'Email delivery unavailable: recipient email or provider is not configured.'
        : 'SMS delivery unavailable: recipient phone, provider, or SMS setting is not configured.');
    }

    const type = notification.type;
    const templates = await this.templates();
    const message = delivery.channel === NotificationChannel.SMS
      ? this.render(templates[type] ?? notification.message, { type, title: notification.title, message: notification.message, metadata })
      : notification.message;
    await provider.send({
      to: recipient,
      subject: notification.title,
      message,
      idempotencyKey: delivery.id,
    });
    await this.prisma.notification.update({
      where: { id: notification.id },
      data: { status: NotificationStatus.SENT, sentAt: new Date() },
    });
    await this.prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: { notificationId: notification.id, status: NotificationDeliveryStatus.SENT, sentAt: new Date(), processingStartedAt: null, lastError: null },
    });
  }

  async listAdminDeliveries(roles: RoleCode[], status?: string) {
    if (!roles.includes(RoleCode.SUPER_ADMIN)) throw new ForbiddenException('Super Admin permission required');
    const allowed = new Set(['PENDING', 'PROCESSING', 'SENT', 'FAILED']);
    return this.prisma.notificationDelivery.findMany({
      where: { status: status && allowed.has(status) ? status as never : undefined },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        recipient: { select: { id: true, email: true, phone: true } },
        notification: { select: { id: true, type: true, title: true, status: true } },
        outboxEvent: { select: { eventId: true, eventType: true, aggregateType: true, aggregateId: true, status: true } },
      },
    });
  }

  async listAdminEvents(roles: RoleCode[], status?: string) {
    if (!roles.includes(RoleCode.SUPER_ADMIN)) throw new ForbiddenException('Super Admin permission required');
    const allowed = new Set(['PENDING', 'PROCESSING', 'PROCESSED', 'FAILED']);
    return this.prisma.outboxEvent.findMany({
      where: { status: status && allowed.has(status) ? status as never : undefined },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { deliveries: { select: { id: true, channel: true, status: true, attempts: true, lastError: true, sentAt: true } } },
    });
  }

  async testInApp(user: AuthenticatedUser, input: { type?: string; message?: string }) { return this.notifyEvent(user.id, { type: input.type?.trim() || 'IN_APP_PROVIDER_TEST', title: 'EIASC CRil notification test', message: input.message?.trim() || 'This is a live in-app notification delivery test.' }); }
  async testEmail(user: AuthenticatedUser) { if (!this.emailProvider) throw new ServiceUnavailableException('Resend email provider is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.'); const recipient = await this.prisma.user.findUnique({ where: { id: user.id }, select: { email: true } }); if (!recipient?.email) throw new ServiceUnavailableException('The authenticated user does not have an email address.'); const notification = await this.create(user.id, { type: 'EMAIL_PROVIDER_TEST', title: 'EIASC CRil email delivery test', message: 'This is a live production email delivery test from EIASC CRil.', channel: NotificationChannel.EMAIL }); if (!notification || notification.status !== NotificationStatus.SENT) throw new ServiceUnavailableException('Resend rejected or failed the test delivery. Check notification delivery metadata.'); return { delivered: true, notificationId: notification.id, recipient: recipient.email }; }
  async testSms(user: AuthenticatedUser) { if (!this.smsProvider) throw new ServiceUnavailableException('AfroMessage SMS provider is not configured. Set AFRO_MESSAGE_TOKEN, AFRO_MESSAGE_IDENTIFIER_ID and AFRO_MESSAGE_SENDER_NAME.'); if (!(await this.smsEnabled())) throw new ServiceUnavailableException('SMS notifications are disabled in platform settings.'); const recipient = await this.prisma.user.findUnique({ where: { id: user.id }, select: { phone: true } }); if (!recipient?.phone) throw new ServiceUnavailableException('The authenticated user does not have a phone number.'); const notification = await this.create(user.id, { type: 'SMS_PROVIDER_TEST', title: 'EIASC CRil SMS delivery test', message: 'This is a live production SMS delivery test from EIASC CRil.', channel: NotificationChannel.SMS, metadata: { recipientName: 'Administrator' } }); if (!notification || notification.status !== NotificationStatus.SENT) throw new ServiceUnavailableException('AfroMessage rejected or failed the test delivery. Check notification delivery metadata.'); return { delivered: true, notificationId: notification.id, recipient: recipient.phone }; }
  async notifyEvent(recipientId: string, event: NotificationEvent, channel: NotificationChannel = NotificationChannel.IN_APP) { return this.create(recipientId, { ...event, channel }); }
  async eventIsEnabled(type: string) { return this.eventEnabled(type); }
  async deliverPersistedDelivery(deliveryId: string) {
    const delivery = await this.prisma.notificationDelivery.findUnique({ where: { id: deliveryId }, include: { outboxEvent: true, recipient: { select: { id: true, email: true, phone: true } }, notification: true } });
    if (!delivery) return null;
    const claimed = await this.prisma.notificationDelivery.updateMany({ where: { id: deliveryId, status: { in: [NotificationDeliveryStatus.PENDING, NotificationDeliveryStatus.FAILED] }, nextAttemptAt: { lte: new Date() }, attempts: { lt: 8 } }, data: { status: NotificationDeliveryStatus.PROCESSING, attempts: { increment: 1 }, processingStartedAt: new Date(), lastError: null } });
    if (!claimed.count) return this.prisma.notificationDelivery.findUnique({ where: { id: deliveryId } });
    const attempts = delivery.attempts + 1;
    try {
      const recipient = delivery.recipient;
      if (delivery.channel === NotificationChannel.IN_APP) {
        const notification = delivery.notification ?? await this.prisma.notification.create({ data: { recipientId: recipient.id, channel: NotificationChannel.IN_APP, type: String(delivery.outboxEvent.payload.type ?? delivery.outboxEvent.eventType), title: String(delivery.outboxEvent.payload.title ?? delivery.outboxEvent.eventType), message: String(delivery.outboxEvent.payload.message ?? ''), status: NotificationStatus.SENT, sentAt: new Date(), metadata: delivery.outboxEvent.payload as Prisma.InputJsonValue } });
        await this.prisma.$transaction([
          this.prisma.notification.update({ where: { id: notification.id }, data: { status: NotificationStatus.SENT, sentAt: notification.sentAt ?? new Date() } }),
          this.prisma.notificationDelivery.update({ where: { id: deliveryId }, data: { notificationId: notification.id, status: NotificationDeliveryStatus.SENT, sentAt: new Date(), processingStartedAt: null } }),
        ]);
        return notification;
      }
      const provider = delivery.channel === NotificationChannel.EMAIL ? this.emailProvider : this.smsProvider;
      const destination = delivery.channel === NotificationChannel.EMAIL ? recipient.email : recipient.phone;
      if (!provider || !destination || (delivery.channel === NotificationChannel.SMS && !(await this.smsEnabled()))) throw new Error('Notification provider or recipient destination is not configured');
      const payload = delivery.outboxEvent.payload as Record<string, unknown>;
      const enabled = await this.eventEnabled(String(payload.type ?? delivery.outboxEvent.eventType));
      if (!enabled) { await this.prisma.notificationDelivery.update({ where: { id: deliveryId }, data: { status: NotificationDeliveryStatus.SENT, sentAt: new Date(), processingStartedAt: null, lastError: 'Notification event disabled by platform settings' } }); return null; }
      const type = String(payload.type ?? delivery.outboxEvent.eventType);
      const template = (await this.templates())[type];
      const event: NotificationEvent = { type, title: String(payload.title ?? type), message: String(payload.message ?? ''), metadata: payload };
      const message = template ? this.render(template, event) : event.message;
      const notification = delivery.notification ?? await this.prisma.notification.create({ data: { recipientId: recipient.id, channel: delivery.channel, type, title: event.title, message, status: NotificationStatus.PENDING, metadata: payload as Prisma.InputJsonValue } });
      await provider.send({ to: destination, subject: event.title, message, idempotencyKey: delivery.outboxEvent.eventId + ':' + recipient.id + ':' + delivery.channel });
      await this.prisma.$transaction([
        this.prisma.notification.update({ where: { id: notification.id }, data: { status: NotificationStatus.SENT, sentAt: new Date() } }),
        this.prisma.notificationDelivery.update({ where: { id: deliveryId }, data: { notificationId: notification.id, status: NotificationDeliveryStatus.SENT, sentAt: new Date(), processingStartedAt: null } }),
      ]);
      return notification;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Notification delivery failed';
      const delayMinutes = Math.min(24 * 60, 2 ** Math.min(attempts, 10));
      await this.prisma.notificationDelivery.update({ where: { id: deliveryId }, data: { status: NotificationDeliveryStatus.FAILED, nextAttemptAt: new Date(Date.now() + delayMinutes * 60_000), processingStartedAt: null, lastError: message } });
      if (delivery.notificationId) await this.prisma.notification.update({ where: { id: delivery.notificationId }, data: { status: NotificationStatus.FAILED, metadata: { ...(delivery.notification?.metadata as Record<string, unknown> ?? {}), deliveryError: message, attempts } as Prisma.InputJsonValue } });
      return null;
    }
  }
  async list(user: AuthenticatedUser, unreadOnly = false) { return this.prisma.notification.findMany({ where: { recipientId: user.id, ...(unreadOnly ? { readAt: null } : {}) }, orderBy: { createdAt: 'desc' }, take: 100 }); }
  async markRead(user: AuthenticatedUser, id: string) { const notification = await this.prisma.notification.findFirst({ where: { id, recipientId: user.id } }); if (!notification) throw new NotFoundException('Notification not found'); return this.prisma.notification.update({ where: { id }, data: { readAt: new Date(), status: NotificationStatus.READ } }); }
}
