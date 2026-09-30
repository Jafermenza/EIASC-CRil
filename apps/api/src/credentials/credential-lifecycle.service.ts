import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { NotificationChannel } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CredentialLifecycleService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  onModuleInit() {
    void this.process();
    this.timer = setInterval(() => void this.process(), 24 * 60 * 60 * 1000);
  }

  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  async process() {
    const expiring = await this.prisma.$queryRaw<Array<{ id: string; credentialNumber: string; type: string; expiresAt: Date; institutionId: string | null; licenseInstitutionId: string | null }>>`
      SELECT c.id,c."credentialNumber",c.type,c."expiresAt",c."institutionId",l."institutionId" AS "licenseInstitutionId"
      FROM "Credential" c LEFT JOIN "License" l ON l.id=c."licenseId"
      WHERE c.status='ACTIVE' AND c."expiresAt" IS NOT NULL AND c."expiresAt" <= CURRENT_TIMESTAMP + INTERVAL '30 days'`;
    for (const credential of expiring) {
      if (credential.expiresAt <= new Date()) {
        await this.prisma.credential.update({ where: { id: credential.id }, data: { status: 'EXPIRED' } });
        await this.prisma.$executeRaw`INSERT INTO "CredentialHistory" ("credentialId","action","fromStatus","toStatus","reason") VALUES (${credential.id}::uuid,'EXPIRED','ACTIVE','EXPIRED','Automatic expiry processing')`;
        continue;
      }
      const sent = await this.prisma.notification.findFirst({ where: { type: 'CREDENTIAL_EXPIRY', metadata: { path: ['credentialId'], equals: credential.id } }, select: { id: true } });
      if (sent) continue;
      const institutionId = credential.institutionId ?? credential.licenseInstitutionId;
      if (!institutionId) continue;
      const recipients = await this.prisma.user.findMany({ where: { institutionId, status: 'ACTIVE' }, select: { id: true } });
      const days = Math.max(1, Math.ceil((credential.expiresAt.getTime() - Date.now()) / 86400000));
      await Promise.all(recipients.flatMap((recipient) => [
        this.notifications.notifyEvent(recipient.id, { type: 'CREDENTIAL_EXPIRY', title: 'Credential expiry reminder', message: `Credential ${credential.credentialNumber} expires in ${days} day(s).`, metadata: { credentialId: credential.id, credentialNumber: credential.credentialNumber, type: credential.type, daysToExpiry: days } }),
        this.notifications.notifyEvent(recipient.id, { type: 'CREDENTIAL_EXPIRY', title: 'Credential expiry reminder', message: `Credential ${credential.credentialNumber} expires in ${days} day(s).`, metadata: { credentialId: credential.id, credentialNumber: credential.credentialNumber, type: credential.type, daysToExpiry: days } }, NotificationChannel.EMAIL),
        this.notifications.notifyEvent(recipient.id, { type: 'CREDENTIAL_EXPIRY', title: 'Credential expiry reminder', message: `Credential ${credential.credentialNumber} expires in ${days} day(s).`, metadata: { credentialId: credential.id, credentialNumber: credential.credentialNumber, type: credential.type, daysToExpiry: days } }, NotificationChannel.SMS),
      ]));
    }
  }
}
