import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, RoleCode } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthenticatedUser } from '../auth/auth.types';

export interface LocationHierarchyInput { regionId: string; zoneId: string; subcityId: string; districtId: string; }
interface LocationActorScope { regionId?: string; zoneId?: string; subcityId?: string; districtId?: string; }

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService, private readonly authorization: AuthorizationService) {}

  private validateParentId(parentId?: string): string | undefined {
    if (parentId === undefined) return undefined;
    const value = parentId.trim();
    if (!value) throw new BadRequestException('parentId must not be empty');
    return value;
  }

  async getRegions() { return this.prisma.region.findMany({ orderBy: { name: 'asc' }, select: { id: true, code: true, name: true } }); }
  async getZones(regionId?: string) { const parentId = this.validateParentId(regionId); return this.prisma.zoneCity.findMany({ where: parentId ? { regionId: parentId } : undefined, orderBy: { name: 'asc' }, select: { id: true, code: true, name: true, regionId: true } }); }
  async getSubcities(zoneId?: string) { const parentId = this.validateParentId(zoneId); return this.prisma.subcityTown.findMany({ where: parentId ? { zoneId: parentId } : undefined, orderBy: { name: 'asc' }, select: { id: true, code: true, name: true, zoneId: true } }); }
  async getDistricts(parentId?: string) { const value = this.validateParentId(parentId); return this.prisma.district.findMany({ where: value ? { subcityId: value } : undefined, orderBy: { name: 'asc' }, select: { id: true, code: true, name: true, subcityId: true } }); }

  async validateHierarchy(input: LocationHierarchyInput): Promise<void> {
    const ids = [input.regionId, input.zoneId, input.subcityId, input.districtId].map((id) => id.trim());
    if (ids.some((id) => !id)) throw new BadRequestException('All location IDs are required');
    const district = await this.prisma.district.findUnique({ where: { id: ids[3] }, select: { id: true, subcityId: true, subcity: { select: { id: true, zoneId: true, zone: { select: { id: true, regionId: true } } } } } });
    if (!district || district.id !== ids[3] || district.subcityId !== ids[2] || district.subcity.id !== ids[2] || district.subcity.zoneId !== ids[1] || district.subcity.zone.id !== ids[1] || district.subcity.zone.regionId !== ids[0]) throw new BadRequestException('Location hierarchy is invalid');
  }

  async createRegion(actor: AuthenticatedUser, input: { code: string; name: string }, requestId?: string) {
    this.assertMasterDataAdmin(actor);
    const code = this.required(input.code, 'Region code'); const name = this.required(input.name, 'Region name');
    return this.createWithAudit(actor, 'REGION', { code, name }, requestId, () => this.prisma.region.create({ data: { code, name }, select: { id: true, code: true, name: true } }));
  }

  async createZone(actor: AuthenticatedUser, input: { code: string; name: string; regionId: string }, requestId?: string) {
    const regionId = this.required(input.regionId, 'Region'); await this.assertScopeWrite(actor, { regionId }); await this.requireRegion(regionId);
    const code = this.required(input.code, 'Zone/City code'); const name = this.required(input.name, 'Zone/City name');
    return this.createWithAudit(actor, 'ZONE_CITY', { code, name, regionId }, requestId, () => this.prisma.zoneCity.create({ data: { code, name, regionId }, select: { id: true, code: true, name: true, regionId: true } }));
  }

  async createSubcity(actor: AuthenticatedUser, input: { code: string; name: string; zoneId: string }, requestId?: string) {
    const zoneId = this.required(input.zoneId, 'Zone/City'); const zone = await this.prisma.zoneCity.findUnique({ where: { id: zoneId }, select: { id: true, regionId: true } });
    if (!zone) throw new BadRequestException('Zone/City not found'); await this.assertScopeWrite(actor, { regionId: zone.regionId, zoneId });
    const code = this.required(input.code, 'Sub-city/Town code'); const name = this.required(input.name, 'Sub-city/Town name');
    return this.createWithAudit(actor, 'SUBCITY_TOWN', { code, name, zoneId }, requestId, () => this.prisma.subcityTown.create({ data: { code, name, zoneId }, select: { id: true, code: true, name: true, zoneId: true } }));
  }

  async createDistrict(actor: AuthenticatedUser, input: { code: string; name: string; subcityId: string }, requestId?: string) {
    const subcityId = this.required(input.subcityId, 'Sub-city/Town'); const subcity = await this.prisma.subcityTown.findUnique({ where: { id: subcityId }, select: { id: true, zoneId: true, zone: { select: { regionId: true } } } });
    if (!subcity) throw new BadRequestException('Sub-city/Town not found'); await this.assertScopeWrite(actor, { regionId: subcity.zone.regionId, zoneId: subcity.zoneId, subcityId });
    const code = this.required(input.code, 'District code'); const name = this.required(input.name, 'District name');
    return this.createWithAudit(actor, 'DISTRICT', { code, name, subcityId }, requestId, () => this.prisma.district.create({ data: { code, name, subcityId }, select: { id: true, code: true, name: true, subcityId: true } }));
  }

  async updateRegion(actor: AuthenticatedUser, id: string, input: { code: string; name: string }, requestId?: string) {
    this.assertMasterDataAdmin(actor); return this.updateWithAudit(actor, 'REGION', id, input, requestId, () => this.prisma.region.update({ where: { id }, data: { code: this.required(input.code, 'Region code'), name: this.required(input.name, 'Region name') }, select: { id: true, code: true, name: true } }));
  }

  async updateZone(actor: AuthenticatedUser, id: string, input: { code: string; name: string; regionId: string }, requestId?: string) {
    const current = await this.prisma.zoneCity.findUnique({ where: { id }, select: { id: true, regionId: true } }); if (!current) throw new BadRequestException('Zone/City not found');
    const regionId = this.required(input.regionId, 'Region'); await this.assertScopeWrite(actor, { regionId: current.regionId }); await this.assertScopeWrite(actor, { regionId }); await this.requireRegion(regionId);
    return this.updateWithAudit(actor, 'ZONE_CITY', id, input, requestId, () => this.prisma.zoneCity.update({ where: { id }, data: { code: this.required(input.code, 'Zone/City code'), name: this.required(input.name, 'Zone/City name'), regionId }, select: { id: true, code: true, name: true, regionId: true } }));
  }

  async updateSubcity(actor: AuthenticatedUser, id: string, input: { code: string; name: string; zoneId: string }, requestId?: string) {
    const current = await this.prisma.subcityTown.findUnique({ where: { id }, select: { id: true, zoneId: true, zone: { select: { regionId: true } } } }); if (!current) throw new BadRequestException('Sub-city/Town not found');
    const zone = await this.prisma.zoneCity.findUnique({ where: { id: input.zoneId }, select: { id: true, regionId: true } }); if (!zone) throw new BadRequestException('Zone/City not found');
    await this.assertScopeWrite(actor, { regionId: current.zone.regionId, zoneId: current.zoneId }); await this.assertScopeWrite(actor, { regionId: zone.regionId, zoneId: zone.id });
    return this.updateWithAudit(actor, 'SUBCITY_TOWN', id, input, requestId, () => this.prisma.subcityTown.update({ where: { id }, data: { code: this.required(input.code, 'Sub-city/Town code'), name: this.required(input.name, 'Sub-city/Town name'), zoneId: zone.id }, select: { id: true, code: true, name: true, zoneId: true } }));
  }

  async updateDistrict(actor: AuthenticatedUser, id: string, input: { code: string; name: string; subcityId: string }, requestId?: string) {
    const current = await this.prisma.district.findUnique({ where: { id }, select: { id: true, subcityId: true, subcity: { select: { zoneId: true, zone: { select: { regionId: true } } } } } }); if (!current) throw new BadRequestException('District not found');
    const subcity = await this.prisma.subcityTown.findUnique({ where: { id: input.subcityId }, select: { id: true, zoneId: true, zone: { select: { regionId: true } } } }); if (!subcity) throw new BadRequestException('Sub-city/Town not found');
    await this.assertScopeWrite(actor, { regionId: current.subcity.zone.regionId, zoneId: current.subcity.zoneId, subcityId: current.subcityId }); await this.assertScopeWrite(actor, { regionId: subcity.zone.regionId, zoneId: subcity.zoneId, subcityId: subcity.id });
    return this.updateWithAudit(actor, 'DISTRICT', id, input, requestId, () => this.prisma.district.update({ where: { id }, data: { code: this.required(input.code, 'District code'), name: this.required(input.name, 'District name'), subcityId: subcity.id }, select: { id: true, code: true, name: true, subcityId: true } }));
  }

  private assertMasterDataAdmin(actor: AuthenticatedUser) { if (!actor.roles.some((role) => role === RoleCode.SUPER_ADMIN || role === RoleCode.NATIONAL_ADMIN)) throw new ForbiddenException('Only national administrators can manage regions'); }
  private async assertScopeWrite(actor: AuthenticatedUser, scope: LocationActorScope) {
    if (actor.roles.includes(RoleCode.SUPER_ADMIN) || actor.roles.includes(RoleCode.NATIONAL_ADMIN)) return;
    await this.authorization.assertCanAccess(actor, scope);
    if (actor.roles.includes(RoleCode.REGIONAL_ADMIN) && scope.regionId) return;
    if (actor.roles.includes(RoleCode.ZONE_ADMIN) && scope.zoneId) return;
    if (actor.roles.includes(RoleCode.DISTRICT_ADMIN) && scope.districtId) return;
    throw new ForbiddenException('Insufficient jurisdiction privilege for master data');
  }
  private required(value: string | undefined, label: string): string { const result = value?.trim(); if (!result) throw new BadRequestException(`${label} is required`); return result; }
  private async requireRegion(id: string) { if (!(await this.prisma.region.findUnique({ where: { id }, select: { id: true } }))) throw new BadRequestException('Region not found'); }
  private async createWithAudit<T>(actor: AuthenticatedUser, entityType: string, metadata: Record<string, string>, requestId: string | undefined, action: () => Promise<T>) { const result = await action(); await this.prisma.auditLog.create({ data: { actorUserId: actor.id, action: 'MASTER_DATA_CREATED', entityType, entityId: (result as { id: string }).id, requestId, metadata: metadata as Prisma.InputJsonObject } }); return result; }
  private async updateWithAudit<T>(actor: AuthenticatedUser, entityType: string, id: string, input: Record<string, string>, requestId: string | undefined, action: () => Promise<T>) { const result = await action(); await this.prisma.auditLog.create({ data: { actorUserId: actor.id, action: 'MASTER_DATA_UPDATED', entityType, entityId: id, requestId, metadata: input as Prisma.InputJsonObject } }); return result; }
}
