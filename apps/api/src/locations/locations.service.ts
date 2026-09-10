import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

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
}
