import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipStatus, RoleCode } from '@prisma/client';
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
  async request(user: AuthenticatedUser, body: { memberId?: string; institutionId?: string; membershipType?: string; isPrimary?: boolean }) {
    this.assertRole(user, MANAGE_ROLES);
    if (!body.memberId?.trim() || !body.institutionId?.trim()) throw new BadRequestException('memberId and institutionId are required');
    await this.authorization.assertCanAccess(user, { institutionId: body.institutionId });
    const [member, institution] = await Promise.all([this.prisma.member.findUnique({ where: { id: body.memberId } }), this.prisma.institution.findUnique({ where: { id: body.institutionId } })]);
    if (!member || member.status !== 'ACTIVE') throw new ConflictException('Member must be active');
    if (!institution || institution.status !== 'ACTIVE') throw new ConflictException('Institution must be active');
    const existing = await this.prisma.memberInstitution.findFirst({ where: { memberId: body.memberId, institutionId: body.institutionId, status: { in: [MembershipStatus.PENDING, MembershipStatus.ACTIVE, MembershipStatus.SUSPENDED] } } });
    if (existing) throw new ConflictException('An active or pending membership already exists');
    const membership = await this.prisma.memberInstitution.create({ data: { memberId: body.memberId, institutionId: body.institutionId, membershipType: body.membershipType?.trim() || 'GENERAL', status: MembershipStatus.PENDING, startedAt: new Date(), isPrimary: body.isPrimary ?? false } });
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
