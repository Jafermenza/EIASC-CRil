import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CredentialStatus, CredentialType, NotificationChannel, RoleCode } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma.service';

const CREDENTIAL_ROLES: RoleCode[] = [RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.REGISTRAR];

@Injectable()
export class CredentialsService {
  constructor(private readonly prisma: PrismaService, private readonly authorization: AuthorizationService, private readonly notifications: NotificationsService) {}
  private hash(token: string) { return createHash('sha256').update(token).digest('hex'); }
  private async number(type: CredentialType) {
    const prefix = type === CredentialType.MEMBER ? 'EIASC-M' : type === CredentialType.INSTITUTION ? 'EIASC-I' : 'EIASC-L';
    for (let i = 0; i < 10; i += 1) {
      const number = `${prefix}-${new Date().getUTCFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`;
      if (!(await this.prisma.credential.findUnique({ where: { credentialNumber: number }, select: { id: true } }))) return number;
    }
    throw new ConflictException('Unable to allocate a credential number');
  }
  async issue(user: AuthenticatedUser, type: CredentialType, subjectId: string) {
    if (!user.roles.some((role) => CREDENTIAL_ROLES.includes(role))) throw new ConflictException('Credential issuance is not permitted');
    const token = randomBytes(32).toString('base64url');
    const data: { memberId?: string; institutionId?: string; licenseId?: string; expiresAt?: Date } = {};
    let notificationInstitutionId: string | undefined;
    if (type === CredentialType.MEMBER) {
      const member = await this.prisma.member.findUnique({ where: { id: subjectId } });
      if (!member) throw new NotFoundException('Member not found');
      if (member.status !== 'ACTIVE') throw new ConflictException('Only active members may receive credentials');
      await this.authorization.assertCanAccess(user, { regionId: member.regionId, zoneId: member.zoneId, subcityId: member.subcityId, districtId: member.districtId });
      data.memberId = subjectId;
    } else if (type === CredentialType.INSTITUTION) {
      const institution = await this.prisma.institution.findUnique({ where: { id: subjectId } });
      if (!institution) throw new NotFoundException('Institution not found');
      if (institution.status !== 'ACTIVE') throw new ConflictException('Only active institutions may receive credentials');
      await this.authorization.assertCanAccess(user, { institutionId: subjectId });
      data.institutionId = subjectId; notificationInstitutionId = subjectId;
    } else {
      const license = await this.prisma.license.findUnique({ where: { id: subjectId }, include: { institution: true } });
      if (!license) throw new NotFoundException('License not found');
      if (license.status !== 'ACTIVE') throw new ConflictException('Only active licenses may receive credentials');
      await this.authorization.assertCanAccess(user, { institutionId: license.institutionId });
      data.licenseId = subjectId; data.expiresAt = license.expiresAt ?? undefined; notificationInstitutionId = license.institutionId;
    }
    const credential = await this.prisma.credential.create({ data: { credentialNumber: await this.number(type), type, tokenHash: this.hash(token), ...data } });
    await this.prisma.auditLog.create({ data: { actorUserId: user.id, action: 'CREDENTIAL_ISSUED', entityType: 'Credential', entityId: credential.id, metadata: { type, subjectId } } });
    if (notificationInstitutionId) {
      const recipients = await this.prisma.user.findMany({ where: { institutionId: notificationInstitutionId, status: 'ACTIVE' }, select: { id: true } });
      await Promise.all(recipients.flatMap((recipient) => [this.notifications.notifyEvent(recipient.id, { type: 'CREDENTIAL_ISSUED', title: 'Credential issued', message: `A ${type.toLowerCase()} credential ${credential.credentialNumber} has been issued.`, metadata: { credentialId: credential.id } }), this.notifications.notifyEvent(recipient.id, { type: 'CREDENTIAL_ISSUED_EMAIL', title: 'EIASC credential issued', message: `A ${type.toLowerCase()} credential ${credential.credentialNumber} has been issued.`, metadata: { credentialId: credential.id } }, NotificationChannel.EMAIL)]));
    }
    return this.publicCredential(credential, token);
  }
  async revoke(user: AuthenticatedUser, id: string) {
    const credential = await this.prisma.credential.findUnique({ where: { id } });
    if (!credential) throw new NotFoundException('Credential not found');
    await this.authorization.assertCanAccess(user, { institutionId: credential.institutionId ?? undefined });
    const updated = await this.prisma.credential.update({ where: { id }, data: { status: CredentialStatus.REVOKED, revokedAt: new Date() } });
    await this.prisma.auditLog.create({ data: { actorUserId: user.id, action: 'CREDENTIAL_REVOKED', entityType: 'Credential', entityId: id } });
    return updated;
  }
  async verify(token: string) {
    const credential = await this.prisma.credential.findUnique({ where: { tokenHash: this.hash(token) }, include: { member: true, institution: true, license: { include: { institution: true } } } });
    if (!credential) throw new NotFoundException('Credential not found');
    const expired = credential.expiresAt ? credential.expiresAt <= new Date() : false;
    if (expired && credential.status === CredentialStatus.ACTIVE) await this.prisma.credential.update({ where: { id: credential.id }, data: { status: CredentialStatus.EXPIRED } });
    const institution = credential.institution ?? credential.license?.institution;
    return { verified: credential.status === CredentialStatus.ACTIVE && !expired, credentialType: credential.type, credentialNumber: credential.credentialNumber, publicName: credential.member ? `${credential.member.firstName} ${credential.member.lastName}` : institution?.name, institution: institution?.name, status: expired ? CredentialStatus.EXPIRED : credential.status, issuedAt: credential.issuedAt, expiresAt: credential.expiresAt };
  }
  private publicCredential(credential: { id: string; credentialNumber: string; type: CredentialType; status: CredentialStatus; expiresAt: Date | null }, token: string) { const verificationUrl = `/verify/${encodeURIComponent(token)}`; return { ...credential, verificationUrl, qrPayload: verificationUrl }; }
}
