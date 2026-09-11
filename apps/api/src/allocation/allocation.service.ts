import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AllocationPolicyStatus, AllocationRunStatus, RoleCode } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma.service';

const APPROVERS: RoleCode[] = [RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.FINANCE_OFFICER];

type AllocationFormula = {
  perMemberMultiplier?: number;
  equalizationPerInstitution?: number;
  minimumInstitutionAmount?: number;
  maximumInstitutionAmount?: number;
};

@Injectable()
export class AllocationService {
  constructor(private readonly prisma: PrismaService) {}

  async createPolicy(user: AuthenticatedUser, body: { name: string; version: string; effectiveFrom: string; eligibilityRules: object; formulaDefinition: object }) {
    if (!body.name?.trim() || !body.version?.trim()) throw new BadRequestException('name and version are required');
    if (!body.effectiveFrom || Number.isNaN(new Date(body.effectiveFrom).getTime())) throw new BadRequestException('effectiveFrom must be a valid date');
    this.validateFormula(body.formulaDefinition);
    return this.prisma.allocationPolicy.create({ data: { name: body.name.trim(), version: body.version.trim(), effectiveFrom: new Date(body.effectiveFrom), eligibilityRules: body.eligibilityRules, formulaDefinition: body.formulaDefinition, createdBy: user.id } });
  }
  async approvePolicy(user: AuthenticatedUser, id: string) {
    if (!user.roles.some((role) => APPROVERS.includes(role))) throw new ConflictException('Policy approval is not permitted');
    return this.prisma.allocationPolicy.update({ where: { id }, data: { status: AllocationPolicyStatus.APPROVED, approvedBy: user.id } });
  }
  async preview(user: AuthenticatedUser, body: { policyId: string; period: string; fundingPool: number }) {
    const policy = await this.prisma.allocationPolicy.findUnique({ where: { id: body.policyId } });
    if (!policy || policy.status !== AllocationPolicyStatus.APPROVED) throw new NotFoundException('Approved allocation policy not found');
    if (!body.period?.trim()) throw new BadRequestException('period is required');
    if (!Number.isFinite(body.fundingPool) || body.fundingPool < 0) throw new BadRequestException('fundingPool must be non-negative');
    const formula = this.parseFormula(policy.formulaDefinition);
    const institutions = await this.prisma.institution.findMany({ where: { status: 'ACTIVE' }, select: { id: true } });
    const counts = await this.prisma.memberInstitution.groupBy({ by: ['institutionId'], where: { status: 'ACTIVE', member: { status: 'ACTIVE' } }, _count: { memberId: true } });
    const eligible = counts.reduce((sum, row) => sum + row._count.memberId, 0);
    const multiplier = formula.perMemberMultiplier ?? 1;
    const base = eligible ? (body.fundingPool / eligible) * multiplier : 0;
    const rawBaseTotal = counts.reduce((sum, row) => sum + row._count.memberId * base, 0);
    const availableForEqualization = Math.max(0, body.fundingPool - rawBaseTotal);
    const requestedEqualization = formula.equalizationPerInstitution ?? 0;
    const equalizationPool = Math.min(availableForEqualization, requestedEqualization * institutions.length);
    const equalizationPerInstitution = institutions.length ? equalizationPool / institutions.length : 0;
    const results = institutions.map((institution) => {
      const count = counts.find((row) => row.institutionId === institution.id)?._count.memberId ?? 0;
      const baseAmount = count * base;
      let totalAmount = baseAmount + equalizationPerInstitution;
      if (formula.minimumInstitutionAmount !== undefined) totalAmount = Math.max(totalAmount, formula.minimumInstitutionAmount);
      if (formula.maximumInstitutionAmount !== undefined) totalAmount = Math.min(totalAmount, formula.maximumInstitutionAmount);
      return { institutionId: institution.id, eligibleMemberCount: count, baseAmount, equalizationAmount: totalAmount - baseAmount, totalAmount };
    });
    const totalAllocated = results.reduce((sum, result) => sum + result.totalAmount, 0);
    if (totalAllocated > body.fundingPool + 0.01) throw new ConflictException('Allocation formula exceeds the funding pool');
    const run = await this.prisma.allocationRun.create({ data: { policyId: policy.id, policyVersion: policy.version, period: body.period.trim(), fundingPool: body.fundingPool, eligibleMemberCount: eligible, basePerMemberAmount: base, equalizationPool, totalAllocated, calculatedBy: user.id, results: { create: results } } });
    await this.prisma.auditLog.create({ data: { actorUserId: user.id, action: 'ALLOCATION_PREVIEW_CREATED', entityType: 'AllocationRun', entityId: run.id, metadata: { policyId: policy.id, period: body.period, formula } } });
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
  private validateFormula(input: object) { this.parseFormula(input); }
  private parseFormula(input: object): AllocationFormula {
    const formula = (input ?? {}) as AllocationFormula;
    for (const [key, value] of Object.entries(formula)) if (!['perMemberMultiplier', 'equalizationPerInstitution', 'minimumInstitutionAmount', 'maximumInstitutionAmount'].includes(key)) throw new BadRequestException(`Unsupported allocation formula field: ${key}`);
    for (const [key, value] of Object.entries(formula)) if (value !== undefined && (!Number.isFinite(value) || value < 0)) throw new BadRequestException(`${key} must be a non-negative finite number`);
    if (formula.minimumInstitutionAmount !== undefined && formula.maximumInstitutionAmount !== undefined && formula.minimumInstitutionAmount > formula.maximumInstitutionAmount) throw new BadRequestException('minimumInstitutionAmount cannot exceed maximumInstitutionAmount');
    return formula;
  }
  private async requireRun(id: string) { const run = await this.prisma.allocationRun.findUnique({ where: { id } }); if (!run) throw new NotFoundException('Allocation run not found'); return run; }
}
