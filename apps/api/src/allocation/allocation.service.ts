import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AllocationPolicyStatus, AllocationRunStatus, RoleCode } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma.service';

const APPROVERS: RoleCode[] = [RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.FINANCE_OFFICER];

@Injectable()
export class AllocationService {
  constructor(private readonly prisma: PrismaService) {}

  async createPolicy(user: AuthenticatedUser, body: { name: string; version: string; effectiveFrom: string; eligibilityRules: object; formulaDefinition: object }) {
    if (!body.name?.trim() || !body.version?.trim()) throw new BadRequestException('name and version are required');
    return this.prisma.allocationPolicy.create({ data: { name: body.name.trim(), version: body.version.trim(), effectiveFrom: new Date(body.effectiveFrom), eligibilityRules: body.eligibilityRules, formulaDefinition: body.formulaDefinition, createdBy: user.id } });
  }
  async approvePolicy(user: AuthenticatedUser, id: string) {
    if (!user.roles.some((role) => APPROVERS.includes(role))) throw new ConflictException('Policy approval is not permitted');
    return this.prisma.allocationPolicy.update({ where: { id }, data: { status: AllocationPolicyStatus.APPROVED, approvedBy: user.id } });
  }
  async preview(user: AuthenticatedUser, body: { policyId: string; period: string; fundingPool: number }) {
    const policy = await this.prisma.allocationPolicy.findUnique({ where: { id: body.policyId } });
    if (!policy || policy.status !== AllocationPolicyStatus.APPROVED) throw new NotFoundException('Approved allocation policy not found');
    if (!Number.isFinite(body.fundingPool) || body.fundingPool < 0) throw new BadRequestException('fundingPool must be non-negative');
    const institutions = await this.prisma.institution.findMany({ where: { status: 'ACTIVE' }, select: { id: true } });
    const counts = await this.prisma.memberInstitution.groupBy({ by: ['institutionId'], where: { status: 'ACTIVE', member: { status: 'ACTIVE' } }, _count: { memberId: true } });
    const eligible = counts.reduce((sum, row) => sum + row._count.memberId, 0);
    const base = eligible ? body.fundingPool / eligible : 0;
    const run = await this.prisma.allocationRun.create({ data: { policyId: policy.id, policyVersion: policy.version, period: body.period, fundingPool: body.fundingPool, eligibleMemberCount: eligible, basePerMemberAmount: base, equalizationPool: 0, totalAllocated: body.fundingPool, calculatedBy: user.id, results: { create: institutions.map((institution) => { const count = counts.find((row) => row.institutionId === institution.id)?._count.memberId ?? 0; return { institutionId: institution.id, eligibleMemberCount: count, baseAmount: count * base, equalizationAmount: 0, totalAmount: count * base }; }) } } });
    await this.prisma.auditLog.create({ data: { actorUserId: user.id, action: 'ALLOCATION_PREVIEW_CREATED', entityType: 'AllocationRun', entityId: run.id, metadata: { policyId: policy.id, period: body.period } } });
    return this.get(run.id);
  }
  async review(user: AuthenticatedUser, id: string) { await this.requireRun(id); return this.prisma.allocationRun.update({ where: { id }, data: { status: AllocationRunStatus.UNDER_REVIEW } }); }
  async finalize(user: AuthenticatedUser, id: string) {
    if (!user.roles.some((role) => APPROVERS.includes(role))) throw new ConflictException('Allocation approval is not permitted');
    const run = await this.requireRun(id);
    if (run.status !== AllocationRunStatus.UNDER_REVIEW) throw new ConflictException('Only runs under review can be finalized');
    const finalized = await this.prisma.allocationRun.update({ where: { id }, data: { status: AllocationRunStatus.FINALIZED, approvedAt: new Date(), approvedBy: user.id } });
    await this.prisma.auditLog.create({ data: { actorUserId: user.id, action: 'ALLOCATION_FINALIZED', entityType: 'AllocationRun', entityId: id } });
    return finalized;
  }
  async get(id: string) {
    const run = await this.prisma.allocationRun.findUnique({ where: { id }, include: { policy: true, results: { include: { institution: { select: { name: true, institutionCode: true } } } } } });
    if (!run) throw new NotFoundException('Allocation run not found');
    return run;
  }
  private async requireRun(id: string) { const run = await this.prisma.allocationRun.findUnique({ where: { id } }); if (!run) throw new NotFoundException('Allocation run not found'); return run; }
}
