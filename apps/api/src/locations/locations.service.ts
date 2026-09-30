import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface LocationHierarchyInput {
  regionId: string;
  zoneId: string;
  subcityId?: string;
  districtId?: string;
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
   * Validates a geographic path server-side.
   * Region and Zone/City are required. Sub-city/Town and District/Woreda
   * are optional only when that level is not configured for the selected parent.
   * When a configured child is supplied, it must belong to the selected parent.
   */
  async validateHierarchy(input: LocationHierarchyInput): Promise<void> {
    const regionId = input.regionId.trim();
    const zoneId = input.zoneId.trim();
    const subcityId = input.subcityId?.trim() || undefined;
    const districtId = input.districtId?.trim() || undefined;

    if (!regionId || !zoneId) {
      throw new BadRequestException('Region and zone/city are required');
    }

    const zone = await this.prisma.zoneCity.findUnique({
      where: { id: zoneId },
      select: { id: true, regionId: true },
    });
    if (!zone || zone.regionId !== regionId) {
      throw new BadRequestException('Location hierarchy is invalid');
    }

    const subcities = await this.prisma.subcityTown.findMany({
      where: { zoneId },
      select: { id: true },
    });
    const hasConfiguredSubcities = subcities.length > 0;

    if (subcityId) {
      const subcity = await this.prisma.subcityTown.findUnique({
        where: { id: subcityId },
        select: { id: true, zoneId: true },
      });
      if (!subcity || subcity.zoneId !== zoneId) {
        throw new BadRequestException('Location hierarchy is invalid');
      }
    } else if (hasConfiguredSubcities) {
      throw new BadRequestException('Sub-city/town is required for the selected zone/city');
    }

    if (districtId) {
      const district = await this.prisma.district.findUnique({
        where: { id: districtId },
        select: { id: true, zoneId: true, subcityId: true },
      });
      if (!district) throw new BadRequestException('Location hierarchy is invalid');

      if (subcityId) {
        if (district.subcityId !== subcityId) {
          throw new BadRequestException('Location hierarchy is invalid');
        }
      } else if (district.zoneId !== zoneId) {
        throw new BadRequestException('Location hierarchy is invalid');
      }
    } else {
      const configuredDistricts = await this.prisma.district.count({
        where: subcityId ? { subcityId } : { zoneId },
      });
      if (configuredDistricts > 0) {
        throw new BadRequestException('District/woreda is required for the selected location');
      }
    }
  }
}
