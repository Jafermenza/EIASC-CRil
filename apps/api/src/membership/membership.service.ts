import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InstitutionRelationshipType, MembershipStatus, MemberStatus, InstitutionStatus, RoleCode } from '@prisma/client';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma.service';
import { MembershipCreateInput, MembershipStatusInput } from './membership.types';

const ADMIN_ROLES: RoleCode[] = [
  RoleCode.SUPER_ADMIN,
  RoleCode.NATIONAL_ADMIN,
  RoleCode.REGIONAL_ADMIN,
  RoleCode.ZONE_ADMIN,
  RoleCode.DISTRICT_ADMIN,
  RoleCode.REGISTRAR,
];

@Injectable()
export class MembershipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
  ) {}

  async listForInstitution(user: AuthenticatedUser, institutionId: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { id: true, regionId: true, zoneId: true, subcityId: true, districtId: true },
    });
    if (!institution) throw new NotFoundException('Institution not found');
    await this.authorization.assertCanAccess(user, { institutionId: institution.id });

    return this.prisma.memberInstitution.findMany({
      where: { institutionId },
      orderBy: { createdAt: 'desc' },
      include: {
        member: {
          select: { id: true, membershipNumber: true, firstName: true, middleName: true, lastName: true, phone: true, status: true },
        },
      },
    });
  }

  async create(user: AuthenticatedUser, input: MembershipCreateInput) {
    if (!ADMIN_ROLES.some((role) => user.roles.includes(role)) && user.institutionId !== input.institutionId) {
      throw new ConflictException('Membership administration is not permitted');
    }

    const [member, institution] = await Promise.all([
      this.prisma.member.findUnique({ where: { id: input.memberId } }),
      this.prisma.institution.findUnique({ where: { id: input.institutionId } }),
    ]);
    if (!member) throw new NotFoundException('Member not found');
    if (!institution) throw new NotFoundException('Institution not found');
    await this.authorization.assertCanAccess(user, { institutionId: institution.id });
    if (member.status !== MemberStatus.ACTIVE) throw new BadRequestException('Only active members can be affiliated');
    if (institution.status !== InstitutionStatus.ACTIVE) throw new BadRequestException('Only active institutions can receive members');

    const existing = await this.prisma.memberInstitution.findUnique({
      where: { memberId_institutionId: { memberId: member.id, institutionId: institution.id } },
    });
    if (existing && existing.status !== MembershipStatus.ENDED) throw new ConflictException('Membership already exists');

    const relationship = await this.prisma.memberInstitution.upsert({
      where: { memberId_institutionId: { memberId: member.id, institutionId: institution.id } },
      create: {
        memberId: member.id,
        institutionId: institution.id,
        relationshipType: input.relationshipType ?? InstitutionRelationshipType.PRIMARY,
        status: MembershipStatus.ACTIVE,
        startedAt: new Date(),
      },
      update: {
        relationshipType: input.relationshipType ?? InstitutionRelationshipType.PRIMARY,
        status: MembershipStatus.ACTIVE,
        startedAt: new Date(),
        endedAt: null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: 'MEMBERSHIP_CREATED',
        entityType: 'MemberInstitution',
        entityId: relationship.id,
        metadata: { memberId: member.id, institutionId: institution.id },
      },
    });
    return relationship;
  }

  async updateStatus(user: AuthenticatedUser, id: string, input: MembershipStatusInput) {
    const relationship = await this.prisma.memberInstitution.findUnique({
      where: { id },
      include: { member: true, institution: true },
    });
    if (!relationship) throw new NotFoundException('Membership not found');
    await this.authorization.assertCanAccess(user, { institutionId: relationship.institutionId });

    if (input.status === MembershipStatus.ENDED && !input.reason?.trim()) {
      throw new BadRequestException('A reason is required when ending membership');
    }
    if (input.status === MembershipStatus.ACTIVE && relationship.member.status !== MemberStatus.ACTIVE) {
      throw new BadRequestException('Only active members can have active membership');
    }
    if (input.status === MembershipStatus.ACTIVE && relationship.institution.status !== InstitutionStatus.ACTIVE) {
      throw new BadRequestException('Only active institutions can have active membership');
    }

    const updated = await this.prisma.memberInstitution.update({
      where: { id },
      data: {
        status: input.status,
        endedAt: input.status === MembershipStatus.ENDED ? new Date() : null,
      },
    });
    await this.prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: 'MEMBERSHIP_STATUS_CHANGED',
        entityType: 'MemberInstitution',
        entityId: id,
        metadata: { fromStatus: relationship.status, toStatus: input.status, reason: input.reason },
      },
    });
import { InstitutionRelationshipType, MembershipStatus, RoleCode } from '@prisma/client';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma.service';

const MANAGE_ROLES: RoleCode[] = [RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.REGISTRAR, RoleCode.INSTITUTION_ADMIN];
const APPROVE_ROLES: RoleCode[] = [RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.REGISTRAR];

@Injectable()
export class MembershipService {
  constructor(private readonly prisma: PrismaService, private readonly authorization: AuthorizationService) {}
  private assertRole(user: AuthenticatedUser, roles: RoleCode[]) { if (!user.roles.some((role) => roles.includes(role))) throw new ConflictException('Membership action is not permitted'); }
  async list(user: AuthenticatedUser, institutionId: string) { this.assertRole(user, MANAGE_ROLES); await this.authorization.assertCanAccess(user, { institutionId }); return this.prisma.memberInstitution.findMany({ where: { institutionId }, include: { member: true, institution: { select: { id: true, name: true, institutionCode: true } } }, orderBy: [{ status: 'asc' }, { startedAt: 'desc' }] }); }
  async request(user: AuthenticatedUser, body: { memberId?: string; institutionId?: string; relationshipType?: InstitutionRelationshipType; isPrimary?: boolean }) {
    this.assertRole(user, MANAGE_ROLES);
    if (!body.memberId?.trim() || !body.institutionId?.trim()) throw new BadRequestException('memberId and institutionId are required');
    await this.authorization.assertCanAccess(user, { institutionId: body.institutionId });
    const [member, institution] = await Promise.all([this.prisma.member.findUnique({ where: { id: body.memberId } }), this.prisma.institution.findUnique({ where: { id: body.institutionId } })]);
    if (!member || member.status !== 'ACTIVE') throw new ConflictException('Member must be active');
    if (!institution || institution.status !== 'ACTIVE') throw new ConflictException('Institution must be active');
    const existing = await this.prisma.memberInstitution.findFirst({ where: { memberId: body.memberId, institutionId: body.institutionId, status: { in: [MembershipStatus.PENDING, MembershipStatus.ACTIVE, MembershipStatus.SUSPENDED] } } });
    if (existing) throw new ConflictException('An active or pending membership already exists');
    const membership = await this.prisma.memberInstitution.create({ data: { memberId: body.memberId, institutionId: body.institutionId, relationshipType: body.relationshipType ?? InstitutionRelationshipType.PRIMARY, status: MembershipStatus.PENDING, startedAt: new Date(), } });
    await this.prisma.auditLog.create({ data: { actorUserId: user.id, action: 'MEMBERSHIP_REQUESTED', entityType: 'MemberInstitution', entityId: membership.id, metadata: { memberId: body.memberId, institutionId: body.institutionId } } });
    return membership;
  }
  async setStatus(user: AuthenticatedUser, id: string, status: MembershipStatus) {
    this.assertRole(user, APPROVE_ROLES);
    const membership = await this.prisma.memberInstitution.findUnique({ where: { id } });
    if (!membership) throw new NotFoundException('Membership not found');
    await this.authorization.assertCanAccess(user, { institutionId: membership.institutionId });
    if (status === MembershipStatus.ENDED && membership.endedAt) throw new ConflictException('Membership is already ended');
    if (status === MembershipStatus.ACTIVE && membership.status === MembershipStatus.ENDED) throw new ConflictException('Ended memberships cannot be reactivated');
    const updated = await this.prisma.memberInstitution.update({ where: { id }, data: { status, endedAt: status === MembershipStatus.ENDED ? new Date() : undefined } });
    await this.prisma.auditLog.create({ data: { actorUserId: user.id, action: `MEMBERSHIP_${status}`, entityType: 'MemberInstitution', entityId: id, metadata: { fromStatus: membership.status, toStatus: status } } });
    return updated;
  }
}
