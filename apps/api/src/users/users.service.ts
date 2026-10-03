import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { JurisdictionLevel, Prisma, RoleCode, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { hashPassword } from '../auth/crypto';
import { CredentialProvisioningService } from '../auth/credential-provisioning.service';

const ADMIN_ROLES = [RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.REGISTRAR, RoleCode.INSPECTOR, RoleCode.FINANCE_OFFICER, RoleCode.INSTITUTION_ADMIN, RoleCode.MEMBER];
const JURISDICTION_BY_ROLE: Partial<Record<RoleCode, JurisdictionLevel>> = { [RoleCode.REGIONAL_ADMIN]: JurisdictionLevel.REGION, [RoleCode.ZONE_ADMIN]: JurisdictionLevel.ZONE_CITY, [RoleCode.DISTRICT_ADMIN]: JurisdictionLevel.DISTRICT, [RoleCode.INSTITUTION_ADMIN]: JurisdictionLevel.INSTITUTION };
interface CreateUserInput { email?: string; phone?: string; password?: string; role?: RoleCode; jurisdictionLevel?: JurisdictionLevel; jurisdictionId?: string | null; institutionId?: string | null }
interface UpdateUserInput { status?: UserStatus; role?: RoleCode; jurisdictionLevel?: JurisdictionLevel; jurisdictionId?: string | null; institutionId?: string | null; password?: string }

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService, private readonly authorization: AuthorizationService, private readonly credentials: CredentialProvisioningService) {}
  private async userResourceScope(user: { jurisdictionLevel: JurisdictionLevel; jurisdictionId: string | null; institutionId: string | null }) {
    if (user.institutionId) {
      const institution = await this.prisma.institution.findUnique({ where: { id: user.institutionId }, select: { id: true, regionId: true, zoneId: true, subcityId: true, districtId: true } });
      return institution ? { institutionId: institution.id, regionId: institution.regionId, zoneId: institution.zoneId, subcityId: institution.subcityId, districtId: institution.districtId } : {};
    }
    if (user.jurisdictionLevel === JurisdictionLevel.INSTITUTION) return { institutionId: user.institutionId ?? user.jurisdictionId ?? undefined };
    if (!user.jurisdictionId || user.jurisdictionLevel === JurisdictionLevel.NATIONAL) return {};
    if (user.jurisdictionLevel === JurisdictionLevel.REGION) return { regionId: user.jurisdictionId };
    if (user.jurisdictionLevel === JurisdictionLevel.ZONE_CITY) {
      const row = await this.prisma.zoneCity.findUnique({ where: { id: user.jurisdictionId }, select: { id: true, regionId: true } });
      return row ? { regionId: row.regionId, zoneId: row.id } : {};
    }
    if (user.jurisdictionLevel === JurisdictionLevel.SUBCITY_TOWN) {
      const row = await this.prisma.subcityTown.findUnique({ where: { id: user.jurisdictionId }, select: { id: true, zoneId: true } });
      if (!row) return {};
      const zone = await this.prisma.zoneCity.findUnique({ where: { id: row.zoneId }, select: { regionId: true } });
      return { regionId: zone?.regionId, zoneId: row.zoneId, subcityId: row.id };
    }
    const row = await this.prisma.district.findUnique({ where: { id: user.jurisdictionId }, select: { id: true, zoneId: true, subcityId: true } });
    if (!row) return {};
    const zone = await this.prisma.zoneCity.findUnique({ where: { id: row.zoneId }, select: { regionId: true } });
    return { regionId: zone?.regionId, zoneId: row.zoneId, subcityId: row.subcityId, districtId: row.id };
  }

  private userMatchesFilters(resource: Record<string, string | null | undefined>, query: { regionId?: string; zoneId?: string; subcityId?: string; districtId?: string; institutionId?: string }) {
    return (!query.regionId || resource.regionId === query.regionId) &&
      (!query.zoneId || resource.zoneId === query.zoneId) &&
      (!query.subcityId || resource.subcityId === query.subcityId) &&
      (!query.districtId || resource.districtId === query.districtId) &&
      (!query.institutionId || resource.institutionId === query.institutionId);
  }

  async list(actor: AuthenticatedUser, query: { search?: string; role?: RoleCode; status?: UserStatus; jurisdictionLevel?: JurisdictionLevel; regionId?: string; zoneId?: string; subcityId?: string; districtId?: string; institutionId?: string; from?: string; to?: string; page?: string; pageSize?: string } = {}) {
    this.assertListAccess(actor);
    const where: Prisma.UserWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.jurisdictionLevel) where.jurisdictionLevel = query.jurisdictionLevel;
    if (query.search?.trim()) where.OR = [{ email: { contains: query.search.trim(), mode: 'insensitive' } }, { phone: { contains: query.search.trim() } }];
    if (query.from || query.to) {
      const createdAt: { gte?: Date; lt?: Date } = {};
      if (query.from) { const d = new Date(query.from); if (!Number.isNaN(d.getTime())) createdAt.gte = d; }
      if (query.to) { const d = new Date(query.to); if (!Number.isNaN(d.getTime())) { d.setUTCDate(d.getUTCDate() + 1); createdAt.lt = d; } }
      where.createdAt = createdAt;
    }
    if (query.role) where.roles = { some: { role: { code: query.role } } };
    const candidates = await this.prisma.user.findMany({ where, include: { roles: { include: { role: true } } }, orderBy: [{ jurisdictionLevel: 'asc' }, { jurisdictionId: 'asc' }, { createdAt: 'desc' }] });
    const requestedScope = { regionId: query.regionId, zoneId: query.zoneId, subcityId: query.subcityId, districtId: query.districtId, institutionId: query.institutionId };
    if (Object.values(requestedScope).some(Boolean)) await this.authorization.assertCanAccess(actor, requestedScope);
    const scoped = [];
    for (const candidate of candidates) {
      const resource = await this.userResourceScope(candidate);
      if ((await this.authorization.canAccess(actor, resource)) && this.userMatchesFilters(resource, requestedScope)) scoped.push(candidate);
    }
    const page = Math.max(1, Number(query.page ?? 1)); const pageSize = Math.min(200, Math.max(1, Number(query.pageSize ?? 50)));
    const start = (page - 1) * pageSize;
    return { items: scoped.slice(start, start + pageSize).map((user) => this.present(user)), page, pageSize, total: scoped.length, totalPages: Math.max(1, Math.ceil(scoped.length / pageSize)) };
  }

  private assertListAccess(actor: AuthenticatedUser) {
    const allowed = [RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.REGISTRAR, RoleCode.INSPECTOR, RoleCode.FINANCE_OFFICER];
    if (!actor.roles.some((role) => allowed.includes(role))) throw new ForbiddenException('User catalog permission required');
  }

  async exportCsv(actor: AuthenticatedUser, query: { search?: string; role?: RoleCode; status?: UserStatus; jurisdictionLevel?: JurisdictionLevel; regionId?: string; zoneId?: string; subcityId?: string; districtId?: string; institutionId?: string; from?: string; to?: string }) {
    const result = await this.list(actor, { ...query, page: '1', pageSize: '200000' });
    const cell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const lines = [
      ['User ID', 'Email', 'Phone', 'Role(s)', 'Status', 'Jurisdiction level', 'Jurisdiction ID', 'Institution ID', 'Created'].map(cell).join(','),
      ...result.items.map((u) => [u.id, u.email, u.phone, u.roles.join(' | '), u.status, u.jurisdictionLevel, u.jurisdictionId, u.institutionId, u.createdAt.toISOString()].map(cell).join(',')),
    ];
    return lines.join('\n');
  }
  async roles(actor: AuthenticatedUser) { if (!actor.roles.includes(RoleCode.SUPER_ADMIN)) throw new ForbiddenException('Only super administrators can manage role assignments'); return this.prisma.role.findMany({ orderBy: { name: 'asc' }, select: { code: true, name: true } }); }
  async get(actor: AuthenticatedUser, id: string) { const user = await this.prisma.user.findUnique({ where: { id }, include: { roles: { include: { role: true } } } }); if (!user) throw new NotFoundException('User not found'); await this.assertManageable(actor, user); return this.present(user); }
  async create(actor: AuthenticatedUser, input: CreateUserInput, requestId?: string) {
    const email = input.email?.trim().toLowerCase() || null; const phone = input.phone?.trim() || null;
    if (!email && !phone) throw new BadRequestException('Email or phone is required'); if (!input.password || input.password.length < 10) throw new BadRequestException('Password must be at least 10 characters'); if (!input.role || !ADMIN_ROLES.includes(input.role)) throw new BadRequestException('A valid role is required');
    const role = input.role; const jurisdictionLevel = input.jurisdictionLevel ?? JurisdictionLevel.NATIONAL; const jurisdictionId = input.jurisdictionId?.trim() || null; const institutionId = input.institutionId?.trim() || null;
    await this.assertAssignmentAllowed(actor, role, jurisdictionLevel, jurisdictionId, institutionId); await this.validateScope(jurisdictionLevel, jurisdictionId, institutionId); const passwordHash = await hashPassword(input.password);
    try { const user = await this.prisma.$transaction(async (tx) => { const created = await tx.user.create({ data: { email, phone, passwordHash, status: UserStatus.ACTIVE, jurisdictionLevel, jurisdictionId, institutionId } }); const dbRole = await tx.role.findUnique({ where: { code: role } }); if (!dbRole) throw new BadRequestException('Role is not configured'); await tx.userRole.create({ data: { userId: created.id, roleId: dbRole.id } }); await tx.auditLog.create({ data: { actorUserId: actor.id, action: 'USER_CREATED', entityType: 'User', entityId: created.id, requestId, metadata: { role, jurisdictionLevel, jurisdictionId, institutionId } } }); return created; }); return this.get(actor, user.id); }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new BadRequestException('Email or phone is already registered'); throw error; }
  }
  async update(actor: AuthenticatedUser, id: string, input: UpdateUserInput, requestId?: string) {
    const existing = await this.prisma.user.findUnique({ where: { id }, include: { roles: { include: { role: true } } } }); if (!existing) throw new NotFoundException('User not found'); await this.assertManageable(actor, existing); if (id === actor.id && input.status && input.status !== UserStatus.ACTIVE) throw new ForbiddenException('You cannot disable or suspend your own account');
    const currentRole = existing.roles[0]?.role.code; const role = input.role ?? currentRole; if (!role) throw new BadRequestException('User role is required'); const jurisdictionLevel = input.jurisdictionLevel ?? existing.jurisdictionLevel; const jurisdictionId = input.jurisdictionId === undefined ? existing.jurisdictionId : input.jurisdictionId?.trim() || null; const institutionId = input.institutionId === undefined ? existing.institutionId : input.institutionId?.trim() || null;
    await this.assertAssignmentAllowed(actor, role, jurisdictionLevel, jurisdictionId, institutionId); await this.validateScope(jurisdictionLevel, jurisdictionId, institutionId); const data: Prisma.UserUpdateInput = { status: input.status, jurisdictionLevel, jurisdictionId, institutionId }; if (input.password !== undefined) { if (input.password.length < 10) throw new BadRequestException('Password must be at least 10 characters'); data.passwordHash = await hashPassword(input.password); }
    await this.prisma.$transaction(async (tx) => { await tx.user.update({ where: { id }, data }); if (role !== currentRole) { const dbRole = await tx.role.findUnique({ where: { code: role } }); if (!dbRole) throw new BadRequestException('Role is not configured'); await tx.userRole.deleteMany({ where: { userId: id } }); await tx.userRole.create({ data: { userId: id, roleId: dbRole.id } }); } await tx.auditLog.create({ data: { actorUserId: actor.id, action: 'USER_UPDATED', entityType: 'User', entityId: id, requestId, metadata: { role, jurisdictionLevel, jurisdictionId, institutionId, status: input.status } } }); }); return this.get(actor, id);
  }
  async remove(actor: AuthenticatedUser, id: string, reason: string, requestId?: string) {
    const existing = await this.prisma.user.findUnique({ where: { id }, include: { roles: { include: { role: true } } } }); if (!existing) throw new NotFoundException('User not found'); if (id === actor.id) throw new ForbiddenException('You cannot deactivate your own account'); await this.assertManageable(actor, existing);
    const cleanReason = reason.trim(); if (cleanReason.length < 5) throw new BadRequestException('Reason must be at least 5 characters'); const now = new Date();
    await this.prisma.$transaction(async (tx) => { await tx.user.update({ where: { id }, data: { status: UserStatus.DISABLED } }); await tx.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: now } }); await tx.auditLog.create({ data: { actorUserId: actor.id, action: 'USER_DEACTIVATED', entityType: 'User', entityId: id, requestId, metadata: { reason: cleanReason, previousStatus: existing.status } } }); await tx.notification.create({ data: { recipientId: id, channel: 'IN_APP', type: 'USER_ACCOUNT_DEACTIVATED', title: 'Account deactivated', message: `Your EIASC account has been deactivated. Reason: ${cleanReason}`, metadata: { reason: cleanReason } } }); });
    return { id, status: UserStatus.DISABLED, message: 'User deactivated and notified' };
  }
  async resetCredentials(actor: AuthenticatedUser, id: string, requestId?: string) {
    const existing = await this.prisma.user.findUnique({ where: { id }, include: { roles: { include: { role: true } } } }); if (!existing) throw new NotFoundException('User not found'); await this.assertManageable(actor, existing);
    await this.credentials.resetCredentials(id, existing.email || existing.phone || 'user');
    await this.prisma.auditLog.create({ data: { actorUserId: actor.id, action: 'USER_CREDENTIALS_RESET', entityType: 'User', entityId: id, requestId } });
    return { id, message: 'Credentials reset and delivered to the account holder' };
  }
  private async assertManageable(actor: AuthenticatedUser, target: { id: string; jurisdictionLevel: JurisdictionLevel; jurisdictionId: string | null; institutionId: string | null; roles: Array<{ role: { code: RoleCode } }> }) { if (target.id === actor.id) return; if (target.institutionId) { await this.authorization.assertCanAccess(actor, { institutionId: target.institutionId }); return; } if (target.jurisdictionLevel === JurisdictionLevel.NATIONAL) { if (!actor.roles.includes(RoleCode.SUPER_ADMIN)) throw new ForbiddenException('Only super administrators can manage national users'); return; } if (!target.jurisdictionId) throw new ForbiddenException('User has no jurisdiction scope'); await this.authorization.assertCanAccess(actor, await this.resolveScope(target.jurisdictionLevel, target.jurisdictionId)); }
  private async assertAssignmentAllowed(actor: AuthenticatedUser, role: RoleCode, level: JurisdictionLevel, jurisdictionId: string | null, institutionId: string | null) { if (role === RoleCode.SUPER_ADMIN && !actor.roles.includes(RoleCode.SUPER_ADMIN)) throw new ForbiddenException('Only super administrators can assign SUPER_ADMIN'); if (actor.roles.includes(RoleCode.INSTITUTION_ADMIN)) throw new ForbiddenException('Institution administrators cannot manage users'); if (JURISDICTION_BY_ROLE[role] && JURISDICTION_BY_ROLE[role] !== level) throw new BadRequestException(`${role} requires ${JURISDICTION_BY_ROLE[role]} jurisdiction`); if (role === RoleCode.INSTITUTION_ADMIN && !institutionId) throw new BadRequestException('Institution administrators require an institution'); if (level !== JurisdictionLevel.NATIONAL && !jurisdictionId && !institutionId) throw new BadRequestException('A jurisdiction or institution is required'); if (level === JurisdictionLevel.NATIONAL && (jurisdictionId || institutionId)) throw new BadRequestException('National users cannot have a jurisdiction or institution scope'); if (actor.roles.includes(RoleCode.SUPER_ADMIN) || actor.roles.includes(RoleCode.NATIONAL_ADMIN)) return; await this.authorization.assertCanAccess(actor, institutionId ? { institutionId } : await this.resolveScope(level, jurisdictionId!)); if (level !== actor.jurisdictionLevel) throw new ForbiddenException('You cannot assign users outside your jurisdiction level'); }
  private async validateScope(level: JurisdictionLevel, jurisdictionId: string | null, institutionId: string | null) { if (level === JurisdictionLevel.NATIONAL) return; if (level === JurisdictionLevel.INSTITUTION) { if (!institutionId) throw new BadRequestException('Institution scope requires institutionId'); if (!(await this.prisma.institution.findUnique({ where: { id: institutionId }, select: { id: true } }))) throw new BadRequestException('Institution not found'); return; } if (!jurisdictionId) throw new BadRequestException('Jurisdiction id is required'); const exists = level === JurisdictionLevel.REGION ? await this.prisma.region.findUnique({ where: { id: jurisdictionId }, select: { id: true } }) : level === JurisdictionLevel.ZONE_CITY ? await this.prisma.zoneCity.findUnique({ where: { id: jurisdictionId }, select: { id: true } }) : level === JurisdictionLevel.SUBCITY_TOWN ? await this.prisma.subcityTown.findUnique({ where: { id: jurisdictionId }, select: { id: true } }) : await this.prisma.district.findUnique({ where: { id: jurisdictionId }, select: { id: true } }); if (!exists) throw new BadRequestException(`Jurisdiction not found for ${level}`); }
  private async resolveScope(level: JurisdictionLevel, id: string) { switch (level) { case JurisdictionLevel.REGION: return { regionId: id }; case JurisdictionLevel.ZONE_CITY: return { zoneId: id }; case JurisdictionLevel.SUBCITY_TOWN: return { subcityId: id }; case JurisdictionLevel.DISTRICT: return { districtId: id }; case JurisdictionLevel.INSTITUTION: return { institutionId: id }; default: return {}; } }
  private async scopeWhere(actor: AuthenticatedUser): Promise<Prisma.UserWhereInput> { if (actor.roles.includes(RoleCode.SUPER_ADMIN) || actor.roles.includes(RoleCode.NATIONAL_ADMIN)) return {}; if (actor.jurisdictionLevel === JurisdictionLevel.INSTITUTION) return { institutionId: actor.institutionId ?? actor.jurisdictionId }; if (!actor.jurisdictionId) return { id: actor.id }; const users = await this.prisma.user.findMany({ where: { jurisdictionLevel: actor.jurisdictionLevel, jurisdictionId: actor.jurisdictionId }, select: { id: true } }); return { id: { in: users.map((u) => u.id) } }; }
  private present(user: any) { return { id: user.id, email: user.email, phone: user.phone, status: user.status, jurisdictionLevel: user.jurisdictionLevel, jurisdictionId: user.jurisdictionId, institutionId: user.institutionId, roles: user.roles.map((r: any) => r.role.code), createdAt: user.createdAt, updatedAt: user.updatedAt }; }
}
