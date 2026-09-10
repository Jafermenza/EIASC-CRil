import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface LocationHierarchyInput {
  regionId: string;
  zoneId: string;
  subcityId: string;
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

  async getDistricts(parentId?: string) {
    const value = this.validateParentId(parentId);
    return this.prisma.district.findMany({
      where: value ? { subcityId: value } : undefined,
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true, subcityId: true },
    });
  }

  /**
   * Validates that all four IDs describe one continuous geographic path:
   * Region -> Zone/City -> Sub-city/Town -> District/Woreda.
   * The check is server-side and uses stable IDs, never names.
   */
  async validateHierarchy(input: LocationHierarchyInput): Promise<void> {
    const ids = [input.regionId, input.zoneId, input.subcityId, input.districtId].map((id) => id.trim());
    if (ids.some((id) => !id)) throw new BadRequestException('All location IDs are required');

    const district = await this.prisma.district.findUnique({
      where: { id: ids[3] },
      select: {
        id: true,
        subcityId: true,
        subcity: {
          select: {
            id: true,
            zoneId: true,
            zone: {
              select: { id: true, regionId: true },
            },
          },
        },
      },
    });

    if (
      !district ||
      district.id !== ids[3] ||
      district.subcityId !== ids[2] ||
      district.subcity.id !== ids[2] ||
      district.subcity.zoneId !== ids[1] ||
      district.subcity.zone.id !== ids[1] ||
      district.subcity.zone.regionId !== ids[0]
    ) {
      throw new BadRequestException('Location hierarchy is invalid');
    }
  }
}
