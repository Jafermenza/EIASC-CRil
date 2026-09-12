import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma.service';

const ADMIN_ROLES: RoleCode[] = [RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN];
const DEFAULTS = { certificateTitle: 'ETHIOPIAN ISLAMIC AFFAIRS SUPREME COUNCIL', certificateSubtitle: 'OPERATIONAL CERTIFICATE', memberCardTitle: 'Islamic Community Membership', issuingAuthority: 'Ethiopian Islamic Affairs Supreme Council', validityYears: 1, authorizedSigner: null, authorizedTitle: null, signatureImageUrl: null, sealImageUrl: null, institutionLabel: 'Institution', locationLabel: 'Location', membershipLabel: 'Membership Number', certificateNumberLabel: 'Certificate Number', issueDateLabel: 'Issue Date', expiryDateLabel: 'Expiry Date', validForLabel: 'Valid for' };

@Injectable()
export class CredentialConfigurationService {
  constructor(private readonly prisma: PrismaService) {}
  private admin(user: AuthenticatedUser) { if (!user.roles.some((r) => ADMIN_ROLES.includes(r))) throw new ForbiddenException('Credential configuration requires Super Admin or National Admin'); }
  private text(value: unknown, field: string, max = 300) { if (value === undefined) return undefined; if (value === null) return null; if (typeof value !== 'string') throw new BadRequestException(`${field} must be a string`); const v = value.trim(); if (v.length > max) throw new BadRequestException(`${field} is too long`); if (/<\/?[a-z][\s\S]*>/i.test(v)) throw new BadRequestException('HTML is not allowed'); return v || null; }
  async get() { const rows = await this.prisma.$queryRaw<any[]>`SELECT * FROM "CredentialConfiguration" WHERE "key"='default' LIMIT 1`; if (rows[0]) return rows[0]; const inserted = await this.prisma.$queryRaw<any[]>`INSERT INTO "CredentialConfiguration" ("key") VALUES ('default') RETURNING *`; return inserted[0]; }
  async update(user: AuthenticatedUser, input: Record<string, unknown>) {
    this.admin(user); const current = await this.get(); const years = input.validityYears === undefined ? current.validityYears : Number(input.validityYears); if (!Number.isInteger(years) || years < 1 || years > 20) throw new BadRequestException('validityYears must be an integer between 1 and 20');
    const value = (k: string, max = 300) => this.text(input[k], k, max) ?? current[k];
    const v = { certificateTitle: value('certificateTitle'), certificateSubtitle: value('certificateSubtitle'), memberCardTitle: value('memberCardTitle'), issuingAuthority: value('issuingAuthority'), validityYears: years, authorizedSigner: value('authorizedSigner'), authorizedTitle: value('authorizedTitle'), signatureImageUrl: value('signatureImageUrl', 200000), sealImageUrl: value('sealImageUrl', 200000), institutionLabel: value('institutionLabel'), locationLabel: value('locationLabel'), membershipLabel: value('membershipLabel'), certificateNumberLabel: value('certificateNumberLabel'), issueDateLabel: value('issueDateLabel'), expiryDateLabel: value('expiryDateLabel'), validForLabel: value('validForLabel') };
    const rows = await this.prisma.$queryRaw<any[]>`UPDATE "CredentialConfiguration" SET "certificateTitle"=${v.certificateTitle},"certificateSubtitle"=${v.certificateSubtitle},"memberCardTitle"=${v.memberCardTitle},"issuingAuthority"=${v.issuingAuthority},"validityYears"=${v.validityYears},"authorizedSigner"=${v.authorizedSigner},"authorizedTitle"=${v.authorizedTitle},"signatureImageUrl"=${v.signatureImageUrl},"sealImageUrl"=${v.sealImageUrl},"institutionLabel"=${v.institutionLabel},"locationLabel"=${v.locationLabel},"membershipLabel"=${v.membershipLabel},"certificateNumberLabel"=${v.certificateNumberLabel},"issueDateLabel"=${v.issueDateLabel},"expiryDateLabel"=${v.expiryDateLabel},"validForLabel"=${v.validForLabel},"updatedBy"=${user.id},"updatedAt"=CURRENT_TIMESTAMP WHERE "key"='default' RETURNING *`;
    await this.prisma.auditLog.create({ data: { actorUserId: user.id, action: 'CREDENTIAL_CONFIGURATION_UPDATED', entityType: 'CredentialConfiguration', entityId: current.id, metadata: v } }); return rows[0];
  }
  defaults() { return DEFAULTS; }
}
