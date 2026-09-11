import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AllocationPolicyStatus, AllocationRunStatus, RoleCode } from '@prisma/client';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma.service';

const POLICY_MANAGERS: RoleCode[] = [RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.FINANCE_OFFICER];
const APPROVERS: RoleCode[] = [RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.FINANCE_OFFICER];

@Injectable()
export class AllocationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
  ) {}

  private requireRole(user: AuthenticatedUser, roles: RoleCode[], message: string) {
    if (!user.roles.some((role) => roles.includes(role))) throw new ConflictException(message);
  }

  async createPolicy(user: AuthenticatedUser, body: { name: string; version: string; effectiveFrom: string; eligibilityRules: object; formulaDefinition: object }) {
    this.requireRole(user, POLICY_MANAGERS, 'Policy administration is not permitted');
    if (!body.name?.trim() || !body.version?.trim()) throw new BadRequestException('name and version are required');
    const effectiveFrom = new Date(body.effectiveFrom);
    if (Number.isNaN(effectiveFrom.getTime())) throw new BadRequestException('effectiveFrom must be a valid date');
    return this.prisma.allocationPolicy.create({ data: { name: body.name.trim(), version: body.version.trim(), effectiveFrom, eligibilityRules: body.eligibilityRules, formulaDefinition: body.formulaDefinition, createdBy: user.id } });
  }

  async approvePolicy(user: AuthenticatedUser, id: string) {
    this.requireRole(user, APPROVERS, 'Policy approval is not permitted');
    const policy = await this.prisma.allocationPolicy.findUnique({ where: { id } });
    if (!policy) throw new NotFoundException('Allocation policy not found');
    if (policy.status !== AllocationPolicyStatus.DRAFT) throw new ConflictException('Only draft policies can be approved');
    if (policy.createdBy === user.id) throw new ConflictException('An administrator cannot approve their own policy');
    return this.prisma.allocationPolicy.update({ where: { id }, data: { status: AllocationPolicyStatus.APPROVED, approvedBy: user.id } });
  }

  async preview(user: AuthenticatedUser, body: { policyId: string; period: string; fundingPool: number }) {
    this.requireRole(user, POLICY_MANAGERS, 'Allocation calculation is not permitted');
    const policy = await this.prisma.allocationPolicy.findUnique({ where: { id: body.policyId } });
    if (!policy || policy.status !== AllocationPolicyStatus.APPROVED) throw new NotFoundException('Approved allocation policy not found');
    if (!body.period?.trim()) throw new BadRequestException('period is required');
    if (!Number.isFinite(body.fundingPool) || body.fundingPool < 0) throw new BadRequestException('fundingPool must be non-negative');
    const institutions = await this.prisma.institution.findMany({ where: { status: 'ACTIVE' }, select: { id: true } });
    const accessibleInstitutions = [];
    for (const institution of institutions) {
      if (await this.authorization.canAccess(user, { institutionId: institution.id })) accessibleInstitutions.push(institution);
    }
    const counts = await this.prisma.memberInstitution.groupBy({ by: ['institutionId'], where: { status: 'ACTIVE', member: { status: 'ACTIVE' } }, _count: { memberId: true } });
    const accessibleIds = new Set(accessibleInstitutions.map((institution) => institution.id));
    const eligible = counts.reduce((sum, row) => sum + (accessibleIds.has(row.institutionId) ? row._count.memberId : 0), 0);
    const base = eligible ? body.fundingPool / eligible : 0;
    const run = await this.prisma.allocationRun.create({ data: { policyId: policy.id, policyVersion: policy.version, period: body.period.trim(), fundingPool: body.fundingPool, eligibleMemberCount: eligible, basePerMemberAmount: base, equalizationPool: 0, totalAllocated: body.fundingPool, calculatedBy: user.id, results: { create: accessibleInstitutions.map((institution) => { const count = counts.find((row) => row.institutionId === institution.id)?._count.memberId ?? 0; return { institutionId: institution.id, eligibleMemberCount: count, baseAmount: count * base, equalizationAmount: 0, totalAmount: count * base }; }) } } });
    await this.prisma.auditLog.create({ data: { actorUserId: user.id, action: 'ALLOCATION_PREVIEW_CREATED', entityType: 'AllocationRun', entityId: run.id, metadata: { policyId: policy.id, period: body.period.trim() } } });
    return this.get(user, run.id);
  }

  async review(user: AuthenticatedUser, id: string) {
    this.requireRole(user, POLICY_MANAGERS, 'Allocation review is not permitted');
    const run = await this.requireRun(id);
    await this.assertRunAccess(user, run.id);
    if (run.status !== AllocationRunStatus.PREVIEW) throw new ConflictException('Only preview runs can enter review');
    return this.prisma.allocationRun.update({ where: { id }, data: { status: AllocationRunStatus.UNDER_REVIEW } });
  }

  async finalize(user: AuthenticatedUser, id: string) {
    this.requireRole(user, APPROVERS, 'Allocation approval is not permitted');
    const run = await this.requireRun(id);
    await this.assertRunAccess(user, run.id);
    if (run.calculatedBy === user.id) throw new ConflictException('An administrator cannot approve their own allocation run');
    if (run.status !== AllocationRunStatus.UNDER_REVIEW) throw new ConflictException('Only runs under review can be finalized');
    const finalized = await this.prisma.allocationRun.update({ where: { id }, data: { status: AllocationRunStatus.FINALIZED, approvedAt: new Date(), approvedBy: user.id } });
    await this.prisma.auditLog.create({ data: { actorUserId: user.id, action: 'ALLOCATION_FINALIZED', entityType: 'AllocationRun', entityId: id } });
    return finalized;
  }

  async get(user: AuthenticatedUser, id: string) {
    const run = await this.prisma.allocationRun.findUnique({ where: { id }, include: { policy: true, results: { include: { institution: { select: { id: true, name: true, institutionCode: true, regionId: true, zoneId: true, subcityId: true, districtId: true } } } } } });
    if (!run) throw new NotFoundException('Allocation run not found');
    await Promise.all(run.results.map((result) => this.authorization.assertCanAccess(user, { institutionId: result.institution.id })));
    return run;
  }

  private async assertRunAccess(user: AuthenticatedUser, id: string) {
    const results = await this.prisma.resourceAllocation.findMany({ where: { allocationRunId: id }, select: { institutionId: true } });
    await Promise.all(results.map((result) => this.authorization.assertCanAccess(user, { institutionId: result.institutionId })));
  }

  private async requireRun(id: string) {
    const run = await this.prisma.allocationRun.findUnique({ where: { id } });
    if (!run) throw new NotFoundException('Allocation run not found');
    return run;
  }
}
