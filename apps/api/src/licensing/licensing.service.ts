import { ConflictException, ForbiddenException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { LicenseApplicationStatus, LicenseStatus, RoleCode } from '@prisma/client';
import { createOpaqueToken } from '../auth/crypto';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma.service';
import { CreateLicenseInput, LicenseListQuery } from './license.types';

const DECISION_ROLES: RoleCode[] = [
  RoleCode.SUPER_ADMIN,
  RoleCode.NATIONAL_ADMIN,
  RoleCode.REGIONAL_ADMIN,
  RoleCode.ZONE_ADMIN,
  RoleCode.DISTRICT_ADMIN,
  RoleCode.REGISTRAR,
  RoleCode.INSPECTOR,
];

@Injectable()
export class LicensingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
  ) {}

  private cleanReason(reason: string): string {
    const value = reason.trim();
    if (!value) throw new BadRequestException('Reason is required');
    if (value.length > 2000) throw new BadRequestException('Reason is too long');
    if (/<\/?[a-z][\s\S]*>/i.test(value)) throw new BadRequestException('HTML is not allowed');
    return value;
  }

  private parseExpiry(value?: string): Date | null {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime()) || date <= new Date()) {
      throw new BadRequestException('expiresAt must be a valid future date');
    }
    return date;
  }

  private async assertInstitutionAccess(user: AuthenticatedUser, institutionId: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: {
        id: true,
        institutionCode: true,
        name: true,
        status: true,
        regionId: true,
        zoneId: true,
        subcityId: true,
        districtId: true,
      },
    });
    if (!institution) throw new NotFoundException('Institution not found');
    await this.authorization.assertCanAccess(user, {
      institutionId: institution.id,
      regionId: institution.regionId,
      zoneId: institution.zoneId,
      subcityId: institution.subcityId,
      districtId: institution.districtId,
    });
    return institution;
  }

  private async assertDecisionRole(user: AuthenticatedUser) {
    if (!user.roles.some((role) => DECISION_ROLES.includes(role))) {
      throw new ForbiddenException('Institution administrators cannot perform licensing decisions');
    }
  }

  private async number(): Promise<string> {
    const year = new Date().getUTCFullYear();
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const suffix = createOpaqueToken(8).replace(/[-_]/g, '').slice(0, 6).toUpperCase();
      const candidate = `EIASC-L-${year}-${suffix}`;
      const existing = await this.prisma.license.findUnique({ where: { licenseNumber: candidate }, select: { id: true } });
      if (!existing) return candidate;
    }
    throw new ConflictException('Unable to allocate a unique license number');
  }

  private async expireIfNeeded(license: any) {
    if (license.status === LicenseStatus.ACTIVE && license.expiresAt && license.expiresAt <= new Date()) {
      return this.prisma.$transaction(async (tx) => {
        const current = await tx.license.findUnique({ where: { id: license.id } });
        if (!current || current.status !== LicenseStatus.ACTIVE || !current.expiresAt || current.expiresAt > new Date()) return current;
        const updated = await tx.license.update({ where: { id: license.id }, data: { status: LicenseStatus.EXPIRED } });
        await tx.auditLog.create({ data: { action: 'LICENSE_EXPIRED', entityType: 'License', entityId: license.id, metadata: { expiresAt: current.expiresAt.toISOString() } } });
        return updated;
      });
    }
    return license;
  }

  async list(user: AuthenticatedUser, query: LicenseListQuery) {
    const page = Math.max(1, Number(query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize ?? 25)));
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.applicationStatus) where.applicationStatus = query.applicationStatus;
    if (query.institutionId) where.institutionId = query.institutionId;
    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { licenseNumber: { contains: search, mode: 'insensitive' } },
        { institution: { name: { contains: search, mode: 'insensitive' } } },
        { institution: { institutionCode: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (query.regionId) where.institution = { ...(where.institution ?? {}), regionId: query.regionId };
    if (query.zoneId) where.institution = { ...(where.institution ?? {}), zoneId: query.zoneId };
    if (query.subcityId) where.institution = { ...(where.institution ?? {}), subcityId: query.subcityId };
    if (query.districtId) where.institution = { ...(where.institution ?? {}), districtId: query.districtId };

    if (!user.roles.some((role) => role === RoleCode.SUPER_ADMIN || role === RoleCode.NATIONAL_ADMIN)) {
      if (query.institutionId) await this.assertInstitutionAccess(user, query.institutionId);
      else if (user.jurisdictionLevel === 'INSTITUTION') {
        if (!user.institutionId) throw new ForbiddenException('No institution assigned');
        where.institutionId = user.institutionId;
      } else {
        const scope: any = {};
        if (user.jurisdictionLevel === 'REGION') scope.regionId = user.jurisdictionId;
        if (user.jurisdictionLevel === 'ZONE_CITY') scope.zoneId = user.jurisdictionId;
        if (user.jurisdictionLevel === 'SUBCITY_TOWN') scope.subcityId = user.jurisdictionId;
        if (user.jurisdictionLevel === 'DISTRICT') scope.districtId = user.jurisdictionId;
        if (Object.keys(scope).length === 0 && user.jurisdictionLevel !== 'NATIONAL') throw new ForbiddenException('No jurisdiction assigned');
        if (Object.keys(scope).length) where.institution = { ...(where.institution ?? {}), ...scope };
      }
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.license.findMany({
        where,
        orderBy: [{ status: 'asc' }, { expiresAt: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { institution: { select: { id: true, institutionCode: true, name: true, status: true, regionId: true, zoneId: true, subcityId: true, districtId: true } } },
      }),
      this.prisma.license.count({ where }),
    ]);
    const refreshed = await Promise.all(items.map((item) => this.expireIfNeeded(item)));
    return { items: refreshed, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
  }

  async get(user: AuthenticatedUser, id: string) {
    const license = await this.prisma.license.findUnique({
      where: { id },
      include: { institution: true },
    });
    if (!license) throw new NotFoundException('License not found');
    await this.authorization.assertCanAccess(user, {
      institutionId: license.institutionId,
      regionId: license.institution.regionId,
      zoneId: license.institution.zoneId,
      subcityId: license.institution.subcityId,
      districtId: license.institution.districtId,
    });
    return this.expireIfNeeded(license);
  }

  async create(user: AuthenticatedUser, input: CreateLicenseInput) {
    await this.assertDecisionRole(user);
    if (!input.institutionId) throw new BadRequestException('institutionId is required');
    const institution = await this.assertInstitutionAccess(user, input.institutionId);
    if (institution.status !== 'ACTIVE') throw new ConflictException('Only active institutions are eligible for licensing');

    const existing = await this.prisma.license.findFirst({ where: { institutionId: institution.id, status: { in: [LicenseStatus.PENDING, LicenseStatus.ACTIVE, LicenseStatus.SUSPENDED] } }, select: { id: true, status: true } });
    if (existing) throw new ConflictException(`Institution already has a ${existing.status.toLowerCase()} license`);

    const license = await this.prisma.license.create({
      data: {
        institutionId: institution.id,
        licenseType: input.licenseType?.trim() || 'INSTITUTIONAL',
        status: LicenseStatus.PENDING,
        applicationStatus: LicenseApplicationStatus.SUBMITTED,
        createdBy: user.id,
      },
    });
    await this.prisma.auditLog.create({ data: { actorUserId: user.id, action: 'LICENSE_APPLICATION_CREATED', entityType: 'License', entityId: license.id, metadata: { institutionId: institution.id } } });
    return license;
  }

  private async transitionApplication(user: AuthenticatedUser, id: string, target: LicenseApplicationStatus, reason?: string) {
    await this.assertDecisionRole(user);
    const license = await this.get(user, id);
    const valid: Record<LicenseApplicationStatus, LicenseApplicationStatus[]> = {
      DRAFT: [LicenseApplicationStatus.SUBMITTED],
      SUBMITTED: [LicenseApplicationStatus.UNDER_REVIEW],
      UNDER_REVIEW: [LicenseApplicationStatus.CORRECTION_REQUIRED, LicenseApplicationStatus.APPROVED, LicenseApplicationStatus.REJECTED],
      CORRECTION_REQUIRED: [LicenseApplicationStatus.RESUBMITTED],
      RESUBMITTED: [LicenseApplicationStatus.UNDER_REVIEW],
      APPROVED: [],
      REJECTED: [],
    };
    if (!valid[license.applicationStatus].includes(target)) throw new ConflictException(`Invalid licensing application transition: ${license.applicationStatus} -> ${target}`);
    const clean = reason ? this.cleanReason(reason) : undefined;
    if ([LicenseApplicationStatus.CORRECTION_REQUIRED, LicenseApplicationStatus.REJECTED].includes(target) && !clean) throw new BadRequestException('Reason is required');
    return { license, reason: clean };
  }

  async review(user: AuthenticatedUser, id: string) {
    const { license } = await this.transitionApplication(user, id, LicenseApplicationStatus.UNDER_REVIEW);
    const updated = await this.prisma.license.update({ where: { id }, data: { applicationStatus: LicenseApplicationStatus.UNDER_REVIEW, reviewedBy: user.id, reviewedAt: new Date() } });
    await this.prisma.auditLog.create({ data: { actorUserId: user.id, action: 'LICENSE_APPLICATION_REVIEWED', entityType: 'License', entityId: id, metadata: { fromStatus: license.applicationStatus } } });
    return updated;
  }

  async requestCorrection(user: AuthenticatedUser, id: string, reason: string) {
    const { license, reason: clean } = await this.transitionApplication(user, id, LicenseApplicationStatus.CORRECTION_REQUIRED, reason);
    const updated = await this.prisma.license.update({ where: { id }, data: { applicationStatus: LicenseApplicationStatus.CORRECTION_REQUIRED, reason: clean, reviewedBy: user.id, reviewedAt: new Date() } });
    await this.prisma.auditLog.create({ data: { actorUserId: user.id, action: 'LICENSE_CORRECTION_REQUESTED', entityType: 'License', entityId: id, metadata: { reason: clean, fromStatus: license.applicationStatus } } });
    return updated;
  }

  async approve(user: AuthenticatedUser, id: string) {
    const { license } = await this.transitionApplication(user, id, LicenseApplicationStatus.APPROVED);
    const updated = await this.prisma.license.update({ where: { id }, data: { applicationStatus: LicenseApplicationStatus.APPROVED, approvedBy: user.id, approvedAt: new Date() } });
    await this.prisma.auditLog.create({ data: { actorUserId: user.id, action: 'LICENSE_APPROVED', entityType: 'License', entityId: id, metadata: { fromStatus: license.applicationStatus } } });
    return updated;
  }

  async issue(user: AuthenticatedUser, id: string, expiresAt?: string) {
    await this.assertDecisionRole(user);
    const license = await this.get(user, id);
    if (license.applicationStatus !== LicenseApplicationStatus.APPROVED) throw new ConflictException('License application must be approved before issuance');
    if (license.status !== LicenseStatus.PENDING) throw new ConflictException(`Only pending licenses can be issued; current status is ${license.status}`);
    const expiry = this.parseExpiry(expiresAt);
    const licenseNumber = await this.number();
    const now = new Date();
    const updated = await this.prisma.license.update({ where: { id }, data: { status: LicenseStatus.ACTIVE, licenseNumber, issuedAt: now, effectiveFrom: now, expiresAt: expiry, issuedBy: user.id, approvedBy: license.approvedBy ?? user.id } });
    await this.prisma.auditLog.create({ data: { actorUserId: user.id, action: 'LICENSE_ISSUED', entityType: 'License', entityId: id, metadata: { licenseNumber, expiresAt: expiry?.toISOString() ?? null } } });
    return updated;
  }

  async suspend(user: AuthenticatedUser, id: string, reason: string) {
    await this.assertDecisionRole(user);
    const clean = this.cleanReason(reason);
    const license = await this.get(user, id);
    if (![LicenseStatus.ACTIVE, LicenseStatus.EXPIRED].includes(license.status)) throw new ConflictException(`Cannot suspend a ${license.status.toLowerCase()} license`);
    const updated = await this.prisma.license.update({ where: { id }, data: { status: LicenseStatus.SUSPENDED, suspendedAt: new Date(), reason: clean } });
    await this.prisma.auditLog.create({ data: { actorUserId: user.id, action: 'LICENSE_SUSPENDED', entityType: 'License', entityId: id, metadata: { reason: clean, fromStatus: license.status } } });
    return updated;
  }

  async restore(user: AuthenticatedUser, id: string) {
    await this.assertDecisionRole(user);
    const license = await this.get(user, id);
    if (license.status !== LicenseStatus.SUSPENDED) throw new ConflictException('Only suspended licenses can be restored');
    if (license.expiresAt && license.expiresAt <= new Date()) throw new ConflictException('Expired licenses must be renewed before restoration');
    const updated = await this.prisma.license.update({ where: { id }, data: { status: LicenseStatus.ACTIVE, suspendedAt: null } });
    await this.prisma.auditLog.create({ data: { actorUserId: user.id, action: 'LICENSE_RESTORED', entityType: 'License', entityId: id } });
    return updated;
  }

  async revoke(user: AuthenticatedUser, id: string, reason: string) {
    await this.assertDecisionRole(user);
    const clean = this.cleanReason(reason);
    const license = await this.get(user, id);
    if (![LicenseStatus.ACTIVE, LicenseStatus.EXPIRED, LicenseStatus.SUSPENDED].includes(license.status)) throw new ConflictException(`Cannot revoke a ${license.status.toLowerCase()} license`);
    const updated = await this.prisma.license.update({ where: { id }, data: { status: LicenseStatus.REVOKED, revokedAt: new Date(), reason: clean } });
    await this.prisma.auditLog.create({ data: { actorUserId: user.id, action: 'LICENSE_REVOKED', entityType: 'License', entityId: id, metadata: { reason: clean, fromStatus: license.status } } });
    return updated;
  }

  async renew(user: AuthenticatedUser, id: string, expiresAt: string) {
    await this.assertDecisionRole(user);
    const expiry = this.parseExpiry(expiresAt);
    if (!expiry) throw new BadRequestException('expiresAt is required');
    const license = await this.get(user, id);
    if (![LicenseStatus.ACTIVE, LicenseStatus.EXPIRED].includes(license.status)) throw new ConflictException(`Cannot renew a ${license.status.toLowerCase()} license`);
    const updated = await this.prisma.license.update({ where: { id }, data: { status: LicenseStatus.ACTIVE, expiresAt: expiry, revokedAt: null, suspendedAt: null } });
    await this.prisma.auditLog.create({ data: { actorUserId: user.id, action: 'LICENSE_RENEWED', entityType: 'License', entityId: id, metadata: { expiresAt: expiry.toISOString(), fromStatus: license.status } } });
    return updated;
  }
}
