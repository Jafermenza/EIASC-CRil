import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InstitutionRelationshipType, MembershipStatus, RoleCode } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const REQUEST_ROLES: RoleCode[] = [
  RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN,
  RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.REGISTRAR,
];
const LIST_ROLES: RoleCode[] = [...REQUEST_ROLES, RoleCode.INSTITUTION_ADMIN];
const DIRECT_ADD_ROLES: RoleCode[] = [...LIST_ROLES];
const APPROVE_ROLES: RoleCode[] = [...REQUEST_ROLES];

type MembershipInput = {
  memberId?: string;
  institutionId?: string;
  relationshipType?: InstitutionRelationshipType;
};

@Injectable()
export class MembershipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
    private readonly notifications: NotificationsService,
  ) {}

  private assertRole(user: AuthenticatedUser, roles: RoleCode[]) {
    if (!user.roles.some((role) => roles.includes(role))) {
      throw new ConflictException('Membership action is not permitted');
    }
  }

  private cleanReason(reason?: string) {
    const value = reason?.trim();
    if (!value) return undefined;
    if (value.length > 500) throw new BadRequestException('Reason must be 500 characters or fewer');
    return value;
  }

  private async loadTarget(memberId: string, institutionId: string) {
    const [member, institution] = await Promise.all([
      this.prisma.member.findUnique({ where: { id: memberId } }),
      this.prisma.institution.findUnique({ where: { id: institutionId } }),
    ]);
    if (!member) throw new NotFoundException('Member not found');
    if (member.status !== 'ACTIVE') throw new ConflictException('Member must be active');
    if (!institution) throw new NotFoundException('Institution not found');
    if (institution.status !== 'ACTIVE') throw new ConflictException('Institution must be active');
    return { member, institution };
  }

  private async assertPrimaryAvailable(memberId: string, relationshipType: InstitutionRelationshipType, institutionId: string) {
    if (relationshipType !== InstitutionRelationshipType.PRIMARY) return;
    const existing = await this.prisma.memberInstitution.findFirst({
      where: {
        memberId,
        relationshipType: InstitutionRelationshipType.PRIMARY,
        status: MembershipStatus.ACTIVE,
        institutionId: { not: institutionId },
      },
      select: { id: true, institutionId: true },
    });
    if (existing) throw new ConflictException('Member already has an active PRIMARY institution');
  }

  private async recordHistory(
    tx: Prisma.TransactionClient,
    membership: { id: string; memberId: string; institutionId: string; relationshipType: InstitutionRelationshipType },
    fromStatus: MembershipStatus | null,
    toStatus: MembershipStatus,
    actorUserId: string | null,
    reason: string | undefined,
    effectiveFrom: Date | null,
    effectiveTo: Date | null,
  ) {
    await tx.memberInstitutionHistory.create({
      data: {
        memberInstitutionId: membership.id,
        memberId: membership.memberId,
        institutionId: membership.institutionId,
        fromStatus,
        toStatus,
        relationshipType: membership.relationshipType,
        actorUserId,
        reason,
        effectiveFrom,
        effectiveTo,
      },
    });
  }

  private async notifyParties(
    membership: { memberId: string; institutionId: string; relationshipType: InstitutionRelationshipType },
    type: 'MEMBERSHIP_REQUESTED' | 'MEMBERSHIP_APPROVED' | 'MEMBERSHIP_SUSPENDED' | 'MEMBERSHIP_ENDED',
    title: string,
    message: string,
  ) {
    const [member, institutionUsers] = await Promise.all([
      this.prisma.member.findUnique({ where: { id: membership.memberId }, select: { email: true, phone: true, firstName: true, lastName: true } }),
      this.prisma.user.findMany({ where: { institutionId: membership.institutionId, status: 'ACTIVE' }, select: { id: true } }),
    ]);
    const memberUsers = member ? await this.prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          ...(member.email ? [{ email: member.email }] : []),
          ...(member.phone ? [{ phone: member.phone }] : []),
        ],
      },
      select: { id: true },
    }) : [];
    const recipientIds = [...new Set([...institutionUsers.map((u) => u.id), ...memberUsers.map((u) => u.id)])];
    await Promise.all(recipientIds.map((recipientId) => this.notifications.notifyEvent(recipientId, {
      type,
      title,
      message,
      metadata: {
        memberId: membership.memberId,
        institutionId: membership.institutionId,
        relationshipType: membership.relationshipType,
        memberName: member ? `${member.firstName} ${member.lastName}`.trim() : undefined,
      },
    }))).catch(() => undefined);
  }

  async list(user: AuthenticatedUser, institutionId: string) {
    this.assertRole(user, LIST_ROLES);
    await this.authorization.assertCanAccess(user, { institutionId });
    return this.prisma.memberInstitution.findMany({
      where: { institutionId },
      include: {
        member: true,
        institution: { select: { id: true, name: true, institutionCode: true } },
        membershipHistory: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: [{ status: 'asc' }, { startedAt: 'desc' }],
    });
  }

  async request(user: AuthenticatedUser, body: MembershipInput) {
    this.assertRole(user, REQUEST_ROLES);
    const memberId = body.memberId?.trim();
    const institutionId = body.institutionId?.trim();
    if (!memberId || !institutionId) throw new BadRequestException('memberId and institutionId are required');
    await this.authorization.assertCanAccess(user, { institutionId });
    const { member, institution } = await this.loadTarget(memberId, institutionId);
    const relationshipType = body.relationshipType ?? InstitutionRelationshipType.PRIMARY;
    await this.assertPrimaryAvailable(memberId, relationshipType, institutionId);
    const existing = await this.prisma.memberInstitution.findFirst({
      where: { memberId, institutionId, status: { in: [MembershipStatus.PENDING, MembershipStatus.ACTIVE, MembershipStatus.SUSPENDED] } },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      throw new ConflictException('An active, suspended or pending membership already exists');
    }

    const now = new Date();
    try {
      const membership = await this.prisma.$transaction(async (tx) => {
        const relation = await tx.memberInstitution.create({
          data: { memberId, institutionId, relationshipType, status: MembershipStatus.PENDING, startedAt: now },
        });
        await this.recordHistory(tx, relation, null, MembershipStatus.PENDING, user.id, undefined, null, null);
        await tx.auditLog.create({
          data: {
            actorUserId: user.id,
            action: 'MEMBERSHIP_REQUESTED',
            entityType: 'MemberInstitution',
            entityId: relation.id,
            metadata: { memberId, institutionId, relationshipType, status: MembershipStatus.PENDING },
          },
        });
        return relation;
      });
      await this.notifyParties(
        membership,
        'MEMBERSHIP_REQUESTED',
        'Membership request received',
        `${member.firstName} ${member.lastName} requested affiliation with ${institution.name}.`,
      );
      return membership;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Member already has an active PRIMARY institution or this membership already exists');
      }
      throw error;
    }
  }

  async directAdd(user: AuthenticatedUser, body: MembershipInput & { reason?: string }) {
    this.assertRole(user, DIRECT_ADD_ROLES);
    const memberId = body.memberId?.trim();
    const institutionId = body.institutionId?.trim();
    if (!memberId || !institutionId) throw new BadRequestException('memberId and institutionId are required');
    await this.authorization.assertCanAccess(user, { institutionId });
    const { member, institution } = await this.loadTarget(memberId, institutionId);
    const relationshipType = body.relationshipType ?? InstitutionRelationshipType.PRIMARY;
    await this.assertPrimaryAvailable(memberId, relationshipType, institutionId);
    const reason = this.cleanReason(body.reason);
    const existing = await this.prisma.memberInstitution.findFirst({
      where: { memberId, institutionId, status: { in: [MembershipStatus.PENDING, MembershipStatus.ACTIVE, MembershipStatus.SUSPENDED] } },
      orderBy: { createdAt: 'desc' },
    });
    if (existing?.status === MembershipStatus.ACTIVE) throw new ConflictException('Member is already associated with this institution');

    const now = new Date();
    try {
      const relation = await this.prisma.$transaction(async (tx) => {
        const updated = existing
          ? await tx.memberInstitution.update({
              where: { id: existing.id },
              data: { status: MembershipStatus.ACTIVE, relationshipType, startedAt: now, endedAt: null },
            })
          : await tx.memberInstitution.create({
              data: { memberId, institutionId, relationshipType, status: MembershipStatus.ACTIVE, startedAt: now },
            });
        await this.recordHistory(tx, updated, existing?.status ?? null, MembershipStatus.ACTIVE, user.id, reason, now, null);
        await tx.auditLog.create({
          data: {
            actorUserId: user.id,
            action: 'MEMBERSHIP_DIRECTLY_ACTIVATED',
            entityType: 'MemberInstitution',
            entityId: updated.id,
            metadata: { memberId, institutionId, relationshipType, reason },
          },
        });
        return updated;
      });
      await this.notifyParties(
        relation,
        'MEMBERSHIP_APPROVED',
        'Membership activated',
        `${member.firstName} ${member.lastName} is now affiliated with ${institution.name}.`,
      );
      return relation;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Member already has an active PRIMARY institution or this membership already exists');
      }
      throw error;
    }
  }

  async setStatus(user: AuthenticatedUser, id: string, status: MembershipStatus, reason?: string) {
    this.assertRole(user, APPROVE_ROLES);
    const membership = await this.prisma.memberInstitution.findUnique({ where: { id } });
    if (!membership) throw new NotFoundException('Membership not found');
    await this.authorization.assertCanAccess(user, { institutionId: membership.institutionId });

    const cleanReason = this.cleanReason(reason);
    const allowed: Record<MembershipStatus, MembershipStatus[]> = {
      PENDING: [MembershipStatus.ACTIVE],
      ACTIVE: [MembershipStatus.SUSPENDED, MembershipStatus.ENDED],
      SUSPENDED: [MembershipStatus.ACTIVE, MembershipStatus.ENDED],
      ENDED: [],
    };
    if (!allowed[membership.status].includes(status)) {
      throw new ConflictException(`Invalid membership transition: ${membership.status} -> ${status}`);
    }
    if ([MembershipStatus.SUSPENDED, MembershipStatus.ENDED].includes(status) && !cleanReason) {
      throw new BadRequestException('A reason is required for suspension or ending');
    }
    if (status === MembershipStatus.ACTIVE) await this.assertPrimaryAvailable(membership.memberId, membership.relationshipType, membership.institutionId);

    const now = new Date();
    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        const relation = await tx.memberInstitution.update({
          where: { id },
          data: {
            status,
            ...(status === MembershipStatus.ACTIVE ? { startedAt: now, endedAt: null } : {}),
            ...(status === MembershipStatus.ENDED ? { endedAt: now } : {}),
          },
        });
        await this.recordHistory(
          tx,
          relation,
          membership.status,
          status,
          user.id,
          cleanReason,
          status === MembershipStatus.ACTIVE ? now : null,
          status === MembershipStatus.ENDED ? now : null,
        );
        await tx.auditLog.create({
          data: {
            actorUserId: user.id,
            action: `MEMBERSHIP_${status}`,
            entityType: 'MemberInstitution',
            entityId: id,
            metadata: { fromStatus: membership.status, toStatus: status, reason: cleanReason },
          },
        });
        return relation;
      });
      const member = await this.prisma.member.findUnique({ where: { id: updated.memberId }, select: { firstName: true, lastName: true } });
      const institution = await this.prisma.institution.findUnique({ where: { id: updated.institutionId }, select: { name: true } });
      const event = status === MembershipStatus.ACTIVE ? 'MEMBERSHIP_APPROVED' : status === MembershipStatus.SUSPENDED ? 'MEMBERSHIP_SUSPENDED' : 'MEMBERSHIP_ENDED';
      await this.notifyParties(
        updated,
        event,
        status === MembershipStatus.ACTIVE ? 'Membership approved' : status === MembershipStatus.SUSPENDED ? 'Membership suspended' : 'Membership ended',
        member && institution ? `${member.firstName} ${member.lastName}'s membership with ${institution.name} is now ${status.toLowerCase()}.` : `Membership status changed to ${status.toLowerCase()}.`,
      );
      return updated;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Member already has an active PRIMARY institution');
      }
      throw error;
    }
  }
}
