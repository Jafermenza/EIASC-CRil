import { Injectable } from '@nestjs/common';
import { JurisdictionLevel, NotificationChannel, RoleCode, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { createOpaqueToken, hashPassword } from './crypto';
import { NotificationsService } from '../notifications/notifications.service';

export interface ProvisionCredentialsInput {
  email?: string | null;
  phone?: string | null;
  role: RoleCode;
  jurisdictionLevel: JurisdictionLevel;
  jurisdictionId?: string | null;
  institutionId?: string | null;
  recipientName: string;
}

/** Creates login accounts for newly approved members/institutions and delivers the generated credentials. */
@Injectable()
export class CredentialProvisioningService {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  private generatePassword(): string {
    return createOpaqueToken(9).replace(/[-_]/g, '').slice(0, 12);
  }

  private async deliver(userId: string, email: string | undefined, phone: string | undefined, title: string, message: string, type: string) {
    await this.notifications.create(userId, { type, title, message, channel: NotificationChannel.IN_APP }).catch(() => undefined);
    if (email) await this.notifications.create(userId, { type, title, message, channel: NotificationChannel.EMAIL }).catch(() => undefined);
    if (phone) await this.notifications.create(userId, { type, title, message, channel: NotificationChannel.SMS }).catch(() => undefined);
  }

  async provision(input: ProvisionCredentialsInput): Promise<{ userId: string; created: boolean }> {
    const email = input.email?.trim().toLowerCase() || undefined;
    const phone = input.phone?.trim() || undefined;
    const existing = email || phone
      ? await this.prisma.user.findFirst({ where: { OR: [email ? { email } : undefined, phone ? { phone } : undefined].filter(Boolean) as Array<{ email: string } | { phone: string }> } })
      : null;
    if (existing) {
      const role = await this.prisma.role.findUniqueOrThrow({ where: { code: input.role } });
      const hasRole = await this.prisma.userRole.findUnique({ where: { userId_roleId: { userId: existing.id, roleId: role.id } } });
      if (!hasRole) await this.prisma.userRole.create({ data: { userId: existing.id, roleId: role.id } });
      return { userId: existing.id, created: false };
    }
    const password = this.generatePassword();
    const passwordHash = await hashPassword(password);
    const role = await this.prisma.role.findUniqueOrThrow({ where: { code: input.role } });
    const user = await this.prisma.user.create({
      data: {
        email, phone, passwordHash, status: UserStatus.ACTIVE,
        jurisdictionLevel: input.jurisdictionLevel, jurisdictionId: input.jurisdictionId ?? null, institutionId: input.institutionId ?? null,
        roles: { create: { roleId: role.id } },
      },
    });
    const username = email || phone || '';
    const message = `Dear ${input.recipientName}, your EIASC CRil account is ready. Username: ${username} · Temporary password: ${password}. Sign in and change your password after first login.`;
    await this.deliver(user.id, email, phone, 'Your EIASC CRil account is ready', message, 'ACCOUNT_CREDENTIALS_ISSUED');
    return { userId: user.id, created: true };
  }

  async resetCredentials(userId: string, recipientName: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const password = this.generatePassword();
    const passwordHash = await hashPassword(password);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    const username = user.email || user.phone || '';
    const message = `Dear ${recipientName}, your EIASC CRil password has been reset by an administrator. Username: ${username} · New temporary password: ${password}. Sign in and change your password immediately.`;
    await this.deliver(userId, user.email ?? undefined, user.phone ?? undefined, 'Your EIASC CRil password has been reset', message, 'ACCOUNT_CREDENTIALS_RESET');
  }
}
