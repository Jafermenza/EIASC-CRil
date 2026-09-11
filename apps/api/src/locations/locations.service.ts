import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface LocationHierarchyInput {
  regionId: string;
  zoneId: string;
  subcityId?: string;
  districtId: string;
}

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  private validateParentId(parentId?: string): string | undefined {
    if (parentId === undefined) return undefined;
    const value = parentId.trim();
    if (!value) throw new BadRequestException('parentId must not be empty');
    return value;
  }

  async getRegions() {
    return this.prisma.region.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true },
    });
  }

  async getZones(regionId?: string) {
    const parentId = this.validateParentId(regionId);
    return this.prisma.zoneCity.findMany({
      where: parentId ? { regionId: parentId } : undefined,
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true, regionId: true },
    });
  }

  async getSubcities(zoneId?: string) {
    const parentId = this.validateParentId(zoneId);
    return this.prisma.subcityTown.findMany({
      where: parentId ? { zoneId: parentId } : undefined,
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true, zoneId: true },
    });
  }

  async getDistricts(subcityId?: string, zoneId?: string) {
    const subcity = this.validateParentId(subcityId);
    const zone = this.validateParentId(zoneId);
    if (subcity && zone) throw new BadRequestException('Provide either subcityId or zoneId, not both');

    return this.prisma.district.findMany({
      where: subcity ? { subcityId: subcity } : zone ? { zoneId: zone } : undefined,
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true, subcityId: true, zoneId: true },
    });
  }

  /**
   * Validates a geographic path server-side. Ethiopia's authoritative source
   * currently publishes Region -> Zone/City -> Woreda, so subcityId is optional.
   * If a sub-city/town exists, it must belong to the selected zone and the
   * district must belong to that sub-city. Otherwise the district must belong
   * directly to the selected zone.
   */
  async validateHierarchy(input: LocationHierarchyInput): Promise<void> {
    const regionId = input.regionId.trim();
    const zoneId = input.zoneId.trim();
    const districtId = input.districtId.trim();
    const subcityId = input.subcityId?.trim() || undefined;

    if (!regionId || !zoneId || !districtId) {
      throw new BadRequestException('Region, zone/city and district/woreda are required');
    }

    const zone = await this.prisma.zoneCity.findUnique({
      where: { id: zoneId },
      select: { id: true, regionId: true },
    });
    if (!zone || zone.regionId !== regionId) {
      throw new BadRequestException('Location hierarchy is invalid');
    }

    const district = await this.prisma.district.findUnique({
      where: { id: districtId },
      select: { id: true, zoneId: true, subcityId: true },
    });
    if (!district) throw new BadRequestException('Location hierarchy is invalid');

    if (subcityId) {
      const subcity = await this.prisma.subcityTown.findUnique({
        where: { id: subcityId },
        select: { id: true, zoneId: true },
      });
      if (!subcity || subcity.zoneId !== zoneId || district.subcityId !== subcityId) {
        throw new BadRequestException('Location hierarchy is invalid');
      }
      return;
    }

    if (district.zoneId !== zoneId) {
      throw new BadRequestException('Location hierarchy is invalid');
    }
  }
}
