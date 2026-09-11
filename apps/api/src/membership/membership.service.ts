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
    return updated;
  }
}
