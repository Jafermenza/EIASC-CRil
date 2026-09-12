import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma.service';

const ADMIN_ROLES: RoleCode[] = [RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN];
const DEFAULTS = {
  certificateTitle: 'ETHIOPIAN ISLAMIC AFFAIRS SUPREME COUNCIL', certificateSubtitle: 'OPERATIONAL CERTIFICATE', memberCardTitle: 'Islamic Community Membership', issuingAuthority: 'Ethiopian Islamic Affairs Supreme Council', validityYears: 1,
  authorizedSigner: null, authorizedTitle: null, signatureImageUrl: null, sealImageUrl: null, institutionLabel: 'Institution', locationLabel: 'Location', membershipLabel: 'Membership Number', certificateNumberLabel: 'Certificate Number', issueDateLabel: 'Issue Date', expiryDateLabel: 'Expiry Date', validForLabel: 'Valid for',
  institutionLogoUrl: null, authorizingNameEn: 'Ethiopian Islamic Affairs Supreme Council', authorizingNameAr: null, licenseTitle: 'Institution License', bodyEn: 'EIASC hereby certifies that the institution identified herein is authorized according to the applicable requirements.', bodyAr: null, locationValue: null, additionalInstitutionInfo: null, frameBackgroundUrl: null, qrEnabled: true, memberFrameBackgroundUrl: null, memberLogoUrl: null, memberAdditionalInfo: null,
};

@Injectable()
export class CredentialConfigurationService {
  constructor(private readonly prisma: PrismaService) {}

  private admin(user: AuthenticatedUser) {
    if (!user.roles.some((r) => ADMIN_ROLES.includes(r))) throw new ForbiddenException('Credential configuration requires Super Admin, National Admin, or Regional Admin');
    if (user.roles.includes(RoleCode.REGIONAL_ADMIN) && !user.regionId && !user.jurisdictionId) throw new ForbiddenException('Regional administrator has no region scope');
  }

  private regionId(user: AuthenticatedUser) {
    return user.roles.includes(RoleCode.REGIONAL_ADMIN) ? (user.regionId ?? user.jurisdictionId ?? null) : null;
  }

  private text(value: unknown, field: string, max = 300) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== 'string') throw new BadRequestException(`${field} must be a string`);
    const v = value.trim();
    if (v.length > max) throw new BadRequestException(`${field} is too long`);
    if (/<\/?[a-z][\s\S]*>/i.test(v)) throw new BadRequestException('HTML is not allowed');
    return v || null;
  }

  private async row(key: string) {
    const rows = await this.prisma.$queryRaw<Record<string, unknown>[]>`SELECT * FROM "CredentialConfiguration" WHERE "key"=${key} LIMIT 1`;
    return rows[0] ?? null;
  }

  async get() {
    const row = await this.row('default');
    if (row) return { ...DEFAULTS, ...row };
    const inserted = await this.prisma.$queryRaw<Record<string, unknown>[]>`INSERT INTO "CredentialConfiguration" ("key") VALUES ('default') RETURNING *`;
    return { ...DEFAULTS, ...inserted[0] };
  }

  async getForUser(user: AuthenticatedUser) {
    const regionalId = user.roles.includes(RoleCode.REGIONAL_ADMIN) ? (user.regionId ?? user.jurisdictionId ?? null) : null;
    if (!regionalId) return this.get();
    const regional = await this.row(`region:${regionalId}`);
    return regional ? { ...DEFAULTS, ...(await this.get()), ...regional } : this.get();
  }

  async update(user: AuthenticatedUser, input: Record<string, unknown>) {
    this.admin(user);
    const regionalId = this.regionId(user);
    const key = regionalId ? `region:${regionalId}` : 'default';
    const current = await this.getForUser(user);
    const years = input.validityYears === undefined ? Number(current.validityYears) : Number(input.validityYears);
    if (!Number.isInteger(years) || years < 1 || years > 20) throw new BadRequestException('validityYears must be an integer between 1 and 20');
    const value = (k: string, max = 300) => this.text(input[k], k, max) ?? current[k];
    const v = {
      certificateTitle: value('certificateTitle'), certificateSubtitle: value('certificateSubtitle'), memberCardTitle: value('memberCardTitle'), issuingAuthority: value('issuingAuthority'), validityYears: years,
      authorizedSigner: value('authorizedSigner'), authorizedTitle: value('authorizedTitle'), signatureImageUrl: value('signatureImageUrl', 200000), sealImageUrl: value('sealImageUrl', 200000), institutionLabel: value('institutionLabel'), locationLabel: value('locationLabel'), membershipLabel: value('membershipLabel'), certificateNumberLabel: value('certificateNumberLabel'), issueDateLabel: value('issueDateLabel'), expiryDateLabel: value('expiryDateLabel'), validForLabel: value('validForLabel'),
      institutionLogoUrl: value('institutionLogoUrl', 200000), authorizingNameEn: value('authorizingNameEn'), authorizingNameAr: value('authorizingNameAr'), licenseTitle: value('licenseTitle'), bodyEn: value('bodyEn', 5000), bodyAr: value('bodyAr', 5000), locationValue: value('locationValue'), additionalInstitutionInfo: value('additionalInstitutionInfo', 5000), frameBackgroundUrl: value('frameBackgroundUrl', 200000), qrEnabled: input.qrEnabled === undefined ? Boolean(current.qrEnabled) : Boolean(input.qrEnabled), memberFrameBackgroundUrl: value('memberFrameBackgroundUrl', 200000), memberLogoUrl: value('memberLogoUrl', 200000), memberAdditionalInfo: value('memberAdditionalInfo', 5000),
    };
    const rows = await this.prisma.$queryRaw<Record<string, unknown>[]>`
      INSERT INTO "CredentialConfiguration" ("key","regionId","certificateTitle","certificateSubtitle","memberCardTitle","issuingAuthority","validityYears","authorizedSigner","authorizedTitle","signatureImageUrl","sealImageUrl","institutionLabel","locationLabel","membershipLabel","certificateNumberLabel","issueDateLabel","expiryDateLabel","validForLabel","institutionLogoUrl","authorizingNameEn","authorizingNameAr","licenseTitle","bodyEn","bodyAr","locationValue","additionalInstitutionInfo","frameBackgroundUrl","qrEnabled","memberFrameBackgroundUrl","memberLogoUrl","memberAdditionalInfo","updatedBy","updatedAt")
      VALUES (${key},${regionalId},${v.certificateTitle},${v.certificateSubtitle},${v.memberCardTitle},${v.issuingAuthority},${v.validityYears},${v.authorizedSigner},${v.authorizedTitle},${v.signatureImageUrl},${v.sealImageUrl},${v.institutionLabel},${v.locationLabel},${v.membershipLabel},${v.certificateNumberLabel},${v.issueDateLabel},${v.expiryDateLabel},${v.validForLabel},${v.institutionLogoUrl},${v.authorizingNameEn},${v.authorizingNameAr},${v.licenseTitle},${v.bodyEn},${v.bodyAr},${v.locationValue},${v.additionalInstitutionInfo},${v.frameBackgroundUrl},${v.qrEnabled},${v.memberFrameBackgroundUrl},${v.memberLogoUrl},${v.memberAdditionalInfo},${user.id},CURRENT_TIMESTAMP)
      ON CONFLICT ("key") DO UPDATE SET "regionId"=EXCLUDED."regionId","certificateTitle"=EXCLUDED."certificateTitle","certificateSubtitle"=EXCLUDED."certificateSubtitle","memberCardTitle"=EXCLUDED."memberCardTitle","issuingAuthority"=EXCLUDED."issuingAuthority","validityYears"=EXCLUDED."validityYears","authorizedSigner"=EXCLUDED."authorizedSigner","authorizedTitle"=EXCLUDED."authorizedTitle","signatureImageUrl"=EXCLUDED."signatureImageUrl","sealImageUrl"=EXCLUDED."sealImageUrl","institutionLabel"=EXCLUDED."institutionLabel","locationLabel"=EXCLUDED."locationLabel","membershipLabel"=EXCLUDED."membershipLabel","certificateNumberLabel"=EXCLUDED."certificateNumberLabel","issueDateLabel"=EXCLUDED."issueDateLabel","expiryDateLabel"=EXCLUDED."expiryDateLabel","validForLabel"=EXCLUDED."validForLabel","institutionLogoUrl"=EXCLUDED."institutionLogoUrl","authorizingNameEn"=EXCLUDED."authorizingNameEn","authorizingNameAr"=EXCLUDED."authorizingNameAr","licenseTitle"=EXCLUDED."licenseTitle","bodyEn"=EXCLUDED."bodyEn","bodyAr"=EXCLUDED."bodyAr","locationValue"=EXCLUDED."locationValue","additionalInstitutionInfo"=EXCLUDED."additionalInstitutionInfo","frameBackgroundUrl"=EXCLUDED."frameBackgroundUrl","qrEnabled"=EXCLUDED."qrEnabled","memberFrameBackgroundUrl"=EXCLUDED."memberFrameBackgroundUrl","memberLogoUrl"=EXCLUDED."memberLogoUrl","memberAdditionalInfo"=EXCLUDED."memberAdditionalInfo","updatedBy"=EXCLUDED."updatedBy","updatedAt"=CURRENT_TIMESTAMP RETURNING *`;
    const id = String(rows[0]?.id ?? current.id);
    await this.prisma.auditLog.create({ data: { actorUserId: user.id, action: 'CREDENTIAL_CONFIGURATION_UPDATED', entityType: 'CredentialConfiguration', entityId: id, metadata: { ...v, regionId: regionalId } } });
    return { ...DEFAULTS, ...rows[0] };
  }

  defaults() { return DEFAULTS; }
}
