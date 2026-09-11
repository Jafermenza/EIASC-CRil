import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AllocationPolicyStatus, AllocationRunStatus, Prisma, RoleCode } from '@prisma/client';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma.service';

type AllocationFormula = {
  perMemberMultiplier?: number;
  equalizationPerInstitution?: number;
  minimumInstitutionAmount?: number;
  maximumInstitutionAmount?: number;
};

@Injectable()
export class AllocationService {
  constructor(private readonly prisma: PrismaService, private readonly authorization: AuthorizationService) {}

  async createPolicy(user: AuthenticatedUser, input: { name: string; version: string; formulaDefinition: AllocationFormula }) {
    this.authorization.assertAnyRole(user, [RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN]);
    this.validateFormula(input.formulaDefinition);
    return this.prisma.allocationPolicy.create({ data: { name: input.name, version: input.version, formulaDefinition: input.formulaDefinition as Prisma.InputJsonValue, eligibilityRules: {}, effectiveFrom: new Date(), status: AllocationPolicyStatus.DRAFT, createdBy: user.id } });
  }

  async approvePolicy(user: AuthenticatedUser, id: string) {
    this.authorization.assertAnyRole(user, [RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN]);
    const policy = await this.prisma.allocationPolicy.findUnique({ where: { id } });
    if (!policy) throw new NotFoundException('Allocation policy not found');
    return this.prisma.allocationPolicy.update({ where: { id }, data: { status: AllocationPolicyStatus.APPROVED, approver: { connect: { id: user.id } } } });
  }

  async preview(user: AuthenticatedUser, input: { policyId: string; period: string; fundingPool: number }) {
    this.authorization.assertAnyRole(user, [RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.FINANCE_OFFICER]);
    if (!Number.isFinite(input.fundingPool) || input.fundingPool < 0) throw new BadRequestException('fundingPool must be non-negative');
    const policy = await this.prisma.allocationPolicy.findUnique({ where: { id: input.policyId } });
    if (!policy || policy.status !== AllocationPolicyStatus.APPROVED) throw new ConflictException('An approved allocation policy is required');
    const formula = this.parseFormula(policy.formulaDefinition);
    const institutions = await this.prisma.institution.findMany({ where: { status: 'ACTIVE' }, select: { id: true } });
    const counts = await this.prisma.memberInstitution.groupBy({ by: ['institutionId'], where: { status: 'ACTIVE', member: { status: 'ACTIVE' }, institution: { status: 'ACTIVE' } }, _count: { memberId: true } });
    const byInstitution = new Map(counts.map((row) => [row.institutionId, row._count.memberId]));
    const eligible = institutions.map((institution) => ({ institutionId: institution.id, memberCount: byInstitution.get(institution.id) ?? 0 }));
    const equalizationPool = (formula.equalizationPerInstitution ?? 0) * eligible.length;
    const proportionalPool = Math.max(0, input.fundingPool - equalizationPool);
    const rawTotal = eligible.reduce((sum, row) => sum + row.memberCount * (formula.perMemberMultiplier ?? 0), 0);
    const multiplier = rawTotal > 0 ? proportionalPool / rawTotal : 0;
    const allocations = eligible.map((row) => {
      let amount = row.memberCount * (formula.perMemberMultiplier ?? 0) * multiplier + (formula.equalizationPerInstitution ?? 0);
      if (formula.minimumInstitutionAmount !== undefined) amount = Math.max(amount, formula.minimumInstitutionAmount);
      if (formula.maximumInstitutionAmount !== undefined) amount = Math.min(amount, formula.maximumInstitutionAmount);
      return { institutionId: row.institutionId, memberCount: row.memberCount, amount: Number(amount.toFixed(2)) };
    });
    const totalAllocated = Number(allocations.reduce((sum, row) => sum + row.amount, 0).toFixed(2));
    const run = await this.prisma.allocationRun.create({ data: { policyId: policy.id, period: input.period, fundingPool: input.fundingPool, policyVersion: policy.version, equalizationPool, totalAllocated, status: AllocationRunStatus.PREVIEW, calculatedBy: user.id, results: { createMany: { data: allocations.map((row) => ({ institutionId: row.institutionId, eligibleMemberCount: row.memberCount, memberCount: row.memberCount, baseAmount: Number((row.amount - (formula.equalizationPerInstitution ?? 0)).toFixed(2)), equalizationAmount: formula.equalizationPerInstitution ?? 0, totalAmount: row.amount })) } } } });
    return run;
  }

  async review(user: AuthenticatedUser, id: string) {
    this.authorization.assertAnyRole(user, [RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.FINANCE_OFFICER]);
    const run = await this.requireRun(id);
    if (run.status !== AllocationRunStatus.PREVIEW) throw new ConflictException('Only preview runs can be submitted for review');
    return this.prisma.allocationRun.update({ where: { id }, data: { status: AllocationRunStatus.UNDER_REVIEW } });
  }

  async finalize(user: AuthenticatedUser, id: string) {
    this.authorization.assertAnyRole(user, [RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN]);
    const run = await this.requireRun(id);
    if (run.status !== AllocationRunStatus.UNDER_REVIEW) throw new ConflictException('Only reviewed allocation runs can be finalized');
    const finalized = await this.prisma.allocationRun.update({ where: { id }, data: { status: AllocationRunStatus.FINALIZED, approver: { connect: { id: user.id } } } });
    await this.prisma.auditLog.create({ data: { actorUserId: user.id, action: 'ALLOCATION_FINALIZED', entityType: 'AllocationRun', entityId: id } });
    return finalized;
  }

  async get(id: string) {
    const run = await this.prisma.allocationRun.findUnique({ where: { id }, include: { policy: true, results: { include: { institution: { select: { name: true, institutionCode: true } } } } } });
    if (!run) throw new NotFoundException('Allocation run not found');
    return run;
  }
  private validateFormula(input: object) { this.parseFormula(input); }
  private parseFormula(input: Prisma.JsonValue): AllocationFormula {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new BadRequestException('Allocation formula must be a JSON object');
    const formula = input as AllocationFormula;
    for (const key of Object.keys(formula)) if (!['perMemberMultiplier', 'equalizationPerInstitution', 'minimumInstitutionAmount', 'maximumInstitutionAmount'].includes(key)) throw new BadRequestException(`Unsupported allocation formula field: ${key}`);
    for (const [key, value] of Object.entries(formula)) if (value !== undefined && (!Number.isFinite(value) || value < 0)) throw new BadRequestException(`${key} must be a non-negative finite number`);
    if (formula.minimumInstitutionAmount !== undefined && formula.maximumInstitutionAmount !== undefined && formula.minimumInstitutionAmount > formula.maximumInstitutionAmount) throw new BadRequestException('minimumInstitutionAmount cannot exceed maximumInstitutionAmount');
    return formula;
  }
  private async requireRun(id: string) { const run = await this.prisma.allocationRun.findUnique({ where: { id } }); if (!run) throw new NotFoundException('Allocation run not found'); return run; }
}
