import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { JurisdictionLevel, Prisma, RoleCode, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { hashPassword } from '../auth/crypto';

const ADMIN_ROLES = [
  RoleCode.SUPER_ADMIN,
  RoleCode.NATIONAL_ADMIN,
  RoleCode.REGIONAL_ADMIN,
  RoleCode.ZONE_ADMIN,
  RoleCode.DISTRICT_ADMIN,
  RoleCode.REGISTRAR,
  RoleCode.INSPECTOR,
  RoleCode.FINANCE_OFFICER,
  RoleCode.INSTITUTION_ADMIN,
  RoleCode.MEMBER,
];

const JURISDICTION_BY_ROLE: Partial<Record<RoleCode, JurisdictionLevel>> = {
  [RoleCode.REGIONAL_ADMIN]: JurisdictionLevel.REGION,
  [RoleCode.ZONE_ADMIN]: JurisdictionLevel.ZONE_CITY,
  [RoleCode.DISTRICT_ADMIN]: JurisdictionLevel.DISTRICT,
  [RoleCode.INSTITUTION_ADMIN]: JurisdictionLevel.INSTITUTION,
};

interface CreateUserInput {
  email?: string;
  phone?: string;
  password?: string;
  role?: RoleCode;
  jurisdictionLevel?: JurisdictionLevel;
  jurisdictionId?: string | null;
  institutionId?: string | null;
}

interface UpdateUserInput {
  status?: UserStatus;
  role?: RoleCode;
  jurisdictionLevel?: JurisdictionLevel;
  jurisdictionId?: string | null;
  institutionId?: string | null;
  password?: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService, private readonly authorization: AuthorizationService) {}

  async list(actor: AuthenticatedUser) {
    const users = await this.prisma.user.findMany({
      where: await this.scopeWhere(actor),
      include: { roles: { include: { role: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return users.map((user) => this.present(user));
  }

  async get(actor: AuthenticatedUser, id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, include: { roles: { include: { role: true } } } });
    if (!user) throw new NotFoundException('User not found');
    await this.assertManageable(actor, user);
    return this.present(user);
  }

  async create(actor: AuthenticatedUser, input: CreateUserInput, requestId?: string) {
    const email = input.email?.trim().toLowerCase() || null;
    const phone = input.phone?.trim() || null;
    if (!email && !phone) throw new BadRequestException('Email or phone is required');
    if (!input.password || input.password.length < 10) throw new BadRequestException('Password must be at least 10 characters');
    if (!input.role || !ADMIN_ROLES.includes(input.role)) throw new BadRequestException('A valid role is required');

    const role = input.role;
    const jurisdictionLevel = input.jurisdictionLevel ?? JurisdictionLevel.NATIONAL;
    const jurisdictionId = input.jurisdictionId?.trim() || null;
    const institutionId = input.institutionId?.trim() || null;

    await this.assertAssignmentAllowed(actor, role, jurisdictionLevel, jurisdictionId, institutionId);
    await this.validateScope(jurisdictionLevel, jurisdictionId, institutionId);

    const passwordHash = await hashPassword(input.password);
    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: { email, phone, passwordHash, status: UserStatus.ACTIVE, jurisdictionLevel, jurisdictionId, institutionId },
        });
        const dbRole = await tx.role.findUnique({ where: { code: role } });
        if (!dbRole) throw new BadRequestException('Role is not configured');
        await tx.userRole.create({ data: { userId: created.id, roleId: dbRole.id } });
        await tx.auditLog.create({
          data: {
            actorUserId: actor.id,
            action: 'USER_CREATED',
            entityType: 'User',
            entityId: created.id,
            requestId,
            metadata: { role, jurisdictionLevel, jurisdictionId, institutionId },
          },
        });
        return created;
      });
      return this.get(actor, user.id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new BadRequestException('Email or phone is already registered');
      throw error;
    }
  }

  async update(actor: AuthenticatedUser, id: string, input: UpdateUserInput, requestId?: string) {
    const existing = await this.prisma.user.findUnique({ where: { id }, include: { roles: { include: { role: true } } } });
    if (!existing) throw new NotFoundException('User not found');
    await this.assertManageable(actor, existing);
    if (id === actor.id && input.status && input.status !== UserStatus.ACTIVE) throw new ForbiddenException('You cannot disable or suspend your own account');

    const currentRole = existing.roles[0]?.role.code;
    const role = input.role ?? currentRole;
    if (!role) throw new BadRequestException('User role is required');
    const jurisdictionLevel = input.jurisdictionLevel ?? existing.jurisdictionLevel;
    const jurisdictionId = input.jurisdictionId === undefined ? existing.jurisdictionId : input.jurisdictionId?.trim() || null;
    const institutionId = input.institutionId === undefined ? existing.institutionId : input.institutionId?.trim() || null;
    await this.assertAssignmentAllowed(actor, role, jurisdictionLevel, jurisdictionId, institutionId);
    await this.validateScope(jurisdictionLevel, jurisdictionId, institutionId);

    const data: Prisma.UserUpdateInput = { status: input.status, jurisdictionLevel, jurisdictionId, institutionId };
    if (input.password !== undefined) {
      if (input.password.length < 10) throw new BadRequestException('Password must be at least 10 characters');
      data.passwordHash = await hashPassword(input.password);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data });
      if (role !== currentRole) {
        const dbRole = await tx.role.findUnique({ where: { code: role } });
        if (!dbRole) throw new BadRequestException('Role is not configured');
        await tx.userRole.deleteMany({ where: { userId: id } });
        await tx.userRole.create({ data: { userId: id, roleId: dbRole.id } });
      }
      await tx.auditLog.create({
        data: { actorUserId: actor.id, action: 'USER_UPDATED', entityType: 'User', entityId: id, requestId, metadata: { role, jurisdictionLevel, jurisdictionId, institutionId, status: input.status } },
      });
    });
    return this.get(actor, id);
  }

  private async assertManageable(actor: AuthenticatedUser, target: { id: string; jurisdictionLevel: JurisdictionLevel; jurisdictionId: string | null; institutionId: string | null; roles: Array<{ role: { code: RoleCode } }> }) {
    if (target.id === actor.id) return;
    const targetResource = { institutionId: target.institutionId, regionId: undefined, zoneId: undefined, subcityId: undefined, districtId: undefined };
    if (target.institutionId) {
      await this.authorization.assertCanAccess(actor, targetResource);
      return;
    }
    if (target.jurisdictionLevel === JurisdictionLevel.NATIONAL) {
      if (!actor.roles.includes(RoleCode.SUPER_ADMIN)) throw new ForbiddenException('Only super administrators can manage national users');
      return;
    }
    if (!target.jurisdictionId) throw new ForbiddenException('User has no jurisdiction scope');
    const scope = await this.resolveScope(target.jurisdictionLevel, target.jurisdictionId);
    await this.authorization.assertCanAccess(actor, scope);
  }

  private async assertAssignmentAllowed(actor: AuthenticatedUser, role: RoleCode, level: JurisdictionLevel, jurisdictionId: string | null, institutionId: string | null) {
    if (role === RoleCode.SUPER_ADMIN && !actor.roles.includes(RoleCode.SUPER_ADMIN)) throw new ForbiddenException('Only super administrators can assign SUPER_ADMIN');
    if (actor.roles.includes(RoleCode.INSTITUTION_ADMIN)) throw new ForbiddenException('Institution administrators cannot manage users');
    if (JURISDICTION_BY_ROLE[role] && JURISDICTION_BY_ROLE[role] !== level) throw new BadRequestException(`${role} requires ${JURISDICTION_BY_ROLE[role]} jurisdiction`);
    if (role === RoleCode.INSTITUTION_ADMIN && !institutionId) throw new BadRequestException('Institution administrators require an institution');
    if (level !== JurisdictionLevel.NATIONAL && !jurisdictionId && !institutionId) throw new BadRequestException('A jurisdiction or institution is required');
    if (level === JurisdictionLevel.NATIONAL && (jurisdictionId || institutionId)) throw new BadRequestException('National users cannot have a jurisdiction or institution scope');
    if (actor.roles.includes(RoleCode.SUPER_ADMIN) || actor.roles.includes(RoleCode.NATIONAL_ADMIN)) return;
    const scope = institutionId ? { institutionId } : await this.resolveScope(level, jurisdictionId!);
    await this.authorization.assertCanAccess(actor, scope);
    if (level !== actor.jurisdictionLevel) throw new ForbiddenException('You cannot assign users outside your jurisdiction level');
  }

  private async validateScope(level: JurisdictionLevel, jurisdictionId: string | null, institutionId: string | null) {
    if (level === JurisdictionLevel.NATIONAL) return;
    if (level === JurisdictionLevel.INSTITUTION) {
      if (!institutionId) throw new BadRequestException('Institution scope requires institutionId');
      const institution = await this.prisma.institution.findUnique({ where: { id: institutionId } });
      if (!institution) throw new BadRequestException('Institution not found');
      return;
    }
    if (!jurisdictionId) throw new BadRequestException('Jurisdiction id is required');
    const scope = await this.resolveScope(level, jurisdictionId);
    if (!scope.regionId && !scope.zoneId && !scope.districtId) throw new BadRequestException('Jurisdiction not found');
  }

  private async resolveScope(level: JurisdictionLevel, id: string) {
    switch (level) {
      case JurisdictionLevel.REGION: return { regionId: id };
      case JurisdictionLevel.ZONE_CITY: return { zoneId: id };
      case JurisdictionLevel.SUBCITY_TOWN: return { subcityId: id };
      case JurisdictionLevel.DISTRICT: return { districtId: id };
      case JurisdictionLevel.INSTITUTION: return { institutionId: id };
      default: return {};
    }
  }

  private async scopeWhere(actor: AuthenticatedUser): Promise<Prisma.UserWhereInput> {
    if (actor.roles.includes(RoleCode.SUPER_ADMIN) || actor.roles.includes(RoleCode.NATIONAL_ADMIN)) return {};
    if (actor.jurisdictionLevel === JurisdictionLevel.INSTITUTION) return { institutionId: actor.institutionId ?? actor.jurisdictionId };
    if (!actor.jurisdictionId) return { id: actor.id };
    const users = await this.prisma.user.findMany({ where: { jurisdictionLevel: actor.jurisdictionLevel, jurisdictionId: actor.jurisdictionId }, select: { id: true } });
    return { id: { in: users.map((u) => u.id) } };
  }

  private present(user: any) {
    return { id: user.id, email: user.email, phone: user.phone, status: user.status, jurisdictionLevel: user.jurisdictionLevel, jurisdictionId: user.jurisdictionId, institutionId: user.institutionId, roles: user.roles.map((r: any) => r.role.code), createdAt: user.createdAt, updatedAt: user.updatedAt };
  }
}
