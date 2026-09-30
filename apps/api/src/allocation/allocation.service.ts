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

type AllocationEligibilityRules = {
  institutionIds?: string[];
  institutionTypeIds?: string[];
  minimumActiveMembers?: number;
};

type AllocationPolicyInput = {
  name: string;
  version: string;
  effectiveFrom?: string;
  eligibilityRules?: AllocationEligibilityRules;
  formulaDefinition: AllocationFormula;
};

@Injectable()
export class AllocationService {
  constructor(private readonly prisma: PrismaService, private readonly authorization: AuthorizationService) {}

  async createPolicy(user: AuthenticatedUser, input: AllocationPolicyInput) {
    this.authorization.assertAnyRole(user, [RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN]);
    if (!input.name?.trim() || !input.version?.trim()) throw new BadRequestException('Policy name and version are required');
    const effectiveFrom = input.effectiveFrom ? new Date(input.effectiveFrom) : new Date();
    if (Number.isNaN(effectiveFrom.getTime())) throw new BadRequestException('effectiveFrom must be a valid date');
    this.validateFormula(input.formulaDefinition);
    const eligibilityRules = this.validateEligibilityRules(input.eligibilityRules ?? {});
    return this.prisma.allocationPolicy.create({
      data: {
        name: input.name.trim(),
        version: input.version.trim(),
        formulaDefinition: input.formulaDefinition as Prisma.InputJsonValue,
        eligibilityRules: eligibilityRules as Prisma.InputJsonValue,
        effectiveFrom,
        status: AllocationPolicyStatus.DRAFT,
        createdBy: user.id,
      },
    });
  }

  async approvePolicy(user: AuthenticatedUser, id: string) {
    this.authorization.assertAnyRole(user, [RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN]);
    const policy = await this.prisma.allocationPolicy.findUnique({ where: { id } });
    if (!policy) throw new NotFoundException('Allocation policy not found');
    if (policy.status !== AllocationPolicyStatus.DRAFT) throw new ConflictException('Only draft policies can be approved');
    const approved = await this.prisma.allocationPolicy.update({
      where: { id },
      data: { status: AllocationPolicyStatus.APPROVED, approver: { connect: { id: user.id } } },
    });
    await this.prisma.auditLog.create({ data: { actorUserId: user.id, action: 'ALLOCATION_POLICY_APPROVED', entityType: 'AllocationPolicy', entityId: id } });
    return approved;
  }

  async preview(user: AuthenticatedUser, input: { policyId: string; period: string; fundingPool: number }) {
    this.authorization.assertAnyRole(user, [RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.FINANCE_OFFICER]);
    if (!input.period?.trim()) throw new BadRequestException('period is required');
    if (!Number.isFinite(input.fundingPool) || input.fundingPool < 0) throw new BadRequestException('fundingPool must be non-negative');
    const policy = await this.prisma.allocationPolicy.findUnique({ where: { id: input.policyId } });
    if (!policy || policy.status !== AllocationPolicyStatus.APPROVED) throw new ConflictException('An approved allocation policy is required');
    const formula = this.parseFormula(policy.formulaDefinition);
    const eligibility = this.validateEligibilityRules(policy.eligibilityRules);
    const institutionWhere: Prisma.InstitutionWhereInput = { status: 'ACTIVE' };
    if (eligibility.institutionIds?.length) institutionWhere.id = { in: eligibility.institutionIds };
    if (eligibility.institutionTypeIds?.length) institutionWhere.institutionTypeId = { in: eligibility.institutionTypeIds };
    const institutions = await this.prisma.institution.findMany({ where: institutionWhere, select: { id: true } });
    const institutionIds = institutions.map((institution) => institution.id);
    const memberships = institutionIds.length
      ? await this.prisma.memberInstitution.findMany({
          where: {
            institutionId: { in: institutionIds },
            status: 'ACTIVE',
            member: { status: 'ACTIVE' },
            institution: { status: 'ACTIVE' },
          },
          select: { institutionId: true },
        })
      : [];
    const byInstitution = new Map<string, number>();
    for (const membership of memberships) byInstitution.set(membership.institutionId, (byInstitution.get(membership.institutionId) ?? 0) + 1);
    const eligible = institutions
      .map((institution) => ({ institutionId: institution.id, memberCount: byInstitution.get(institution.id) ?? 0 }))
      .filter((row) => row.memberCount >= (eligibility.minimumActiveMembers ?? 0));
    const eligibleMemberCount = eligible.reduce((sum, row) => sum + row.memberCount, 0);
    const equalizationPerInstitution = formula.equalizationPerInstitution ?? 0;
    const equalizationPool = equalizationPerInstitution * eligible.length;
    const basePerMemberAmount = Number((input.fundingPool * (formula.perMemberMultiplier ?? 0)).toFixed(2));
    const allocations = eligible.map((row) => {
      let amount = row.memberCount * basePerMemberAmount + equalizationPerInstitution;
      if (formula.minimumInstitutionAmount !== undefined) amount = Math.max(amount, formula.minimumInstitutionAmount);
      if (formula.maximumInstitutionAmount !== undefined) amount = Math.min(amount, formula.maximumInstitutionAmount);
      return { institutionId: row.institutionId, memberCount: row.memberCount, amount: Number(amount.toFixed(2)) };
    });
    const totalAllocated = Number(allocations.reduce((sum, row) => sum + row.amount, 0).toFixed(2));
    if (totalAllocated > input.fundingPool) throw new ConflictException('Calculated allocation exceeds the funding pool');
    return this.prisma.allocationRun.create({
      data: {
        policyId: policy.id,
        period: input.period.trim(),
        fundingPool: input.fundingPool,
        policyVersion: policy.version,
        eligibleMemberCount,
        basePerMemberAmount,
        equalizationPool,
        totalAllocated,
        status: AllocationRunStatus.PREVIEW,
        calculatedBy: user.id,
        results: {
          createMany: {
            data: allocations.map((row) => ({
              institutionId: row.institutionId,
              eligibleMemberCount: row.memberCount,
              baseAmount: Number((row.amount - equalizationPerInstitution).toFixed(2)),
              equalizationAmount: equalizationPerInstitution,
              totalAmount: row.amount,
            })),
          },
        },
      },
    });
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
    const finalized = await this.prisma.allocationRun.update({
      where: { id },
      data: { status: AllocationRunStatus.FINALIZED, approvedAt: new Date(), approver: { connect: { id: user.id } } },
    });
    await this.prisma.auditLog.create({ data: { actorUserId: user.id, action: 'ALLOCATION_FINALIZED', entityType: 'AllocationRun', entityId: id } });
    return finalized;
  }

  async list(user: AuthenticatedUser) {
    this.authorization.assertAnyRole(user, [RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.FINANCE_OFFICER]);
    return this.prisma.allocationRun.findMany({
      orderBy: { calculatedAt: 'desc' },
      include: { policy: { select: { name: true, version: true } }, results: { select: { institutionId: true, totalAmount: true } } },
    });
  }

  async get(user: AuthenticatedUser, id: string) {
    this.authorization.assertAnyRole(user, [RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.FINANCE_OFFICER]);
    const run = await this.prisma.allocationRun.findUnique({ where: { id }, include: { policy: true, results: { include: { institution: { select: { name: true, institutionCode: true } } } } } });
    if (!run) throw new NotFoundException('Allocation run not found');
    return run;
  }

  async export(user: AuthenticatedUser, id: string) {
    const run = await this.get(user, id);
    const rows = [
      ['institutionId', 'institutionCode', 'institutionName', 'eligibleMemberCount', 'baseAmount', 'equalizationAmount', 'totalAmount'],
      ...run.results.map((result) => [
        result.institutionId,
        result.institution.institutionCode ?? '',
        result.institution.name,
        String(result.eligibleMemberCount),
        String(result.baseAmount),
        String(result.equalizationAmount),
        String(result.totalAmount),
      ]),
    ];
    const csvValue = (value: string) => /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
    return {
      filename: `allocation-${run.period}-${run.policyVersion}.csv`,
      csv: rows.map((row) => row.map(csvValue).join(',')).join('\n'),
    };
  }

  private validateFormula(input: AllocationFormula) { this.parseFormula(input as Prisma.JsonValue); }

  private parseFormula(input: Prisma.JsonValue): AllocationFormula {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new BadRequestException('Allocation formula must be a JSON object');
    const formula = input as AllocationFormula;
    for (const key of Object.keys(formula)) if (!['perMemberMultiplier', 'equalizationPerInstitution', 'minimumInstitutionAmount', 'maximumInstitutionAmount'].includes(key)) throw new BadRequestException(`Unsupported allocation formula field: ${key}`);
    for (const [key, value] of Object.entries(formula)) if (value !== undefined && (!Number.isFinite(value) || value < 0)) throw new BadRequestException(`${key} must be a non-negative finite number`);
    if (formula.minimumInstitutionAmount !== undefined && formula.maximumInstitutionAmount !== undefined && formula.minimumInstitutionAmount > formula.maximumInstitutionAmount) throw new BadRequestException('minimumInstitutionAmount cannot exceed maximumInstitutionAmount');
    return formula;
  }

  private validateEligibilityRules(input: Prisma.JsonValue): AllocationEligibilityRules {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new BadRequestException('Eligibility rules must be a JSON object');
    const rules = input as AllocationEligibilityRules;
    for (const key of Object.keys(rules)) if (!['institutionIds', 'institutionTypeIds', 'minimumActiveMembers'].includes(key)) throw new BadRequestException(`Unsupported eligibility rule: ${key}`);
    for (const key of ['institutionIds', 'institutionTypeIds'] as const) {
      if (rules[key] !== undefined && (!Array.isArray(rules[key]) || rules[key].some((value) => typeof value !== 'string' || !value))) throw new BadRequestException(`${key} must be an array of IDs`);
    }
    if (rules.minimumActiveMembers !== undefined && (!Number.isInteger(rules.minimumActiveMembers) || rules.minimumActiveMembers < 0)) throw new BadRequestException('minimumActiveMembers must be a non-negative integer');
    return rules;
  }

  private async requireRun(id: string) {
    const run = await this.prisma.allocationRun.findUnique({ where: { id } });
    if (!run) throw new NotFoundException('Allocation run not found');
    return run;
  }
}