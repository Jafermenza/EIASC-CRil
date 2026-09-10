import { LocationsService } from './locations.service';

describe('LocationsService', () => {
  const prisma = {
    region: { findMany: jest.fn() },
    zoneCity: { findMany: jest.fn() },
    subcityTown: { findMany: jest.fn() },
    district: { findMany: jest.fn() },
  };
  const service = new LocationsService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('lists regions in stable alphabetical order', async () => {
    prisma.region.findMany.mockResolvedValue([{ id: 'r1', code: 'R1', name: 'Addis Ababa' }]);
    await expect(service.getRegions()).resolves.toEqual([{ id: 'r1', code: 'R1', name: 'Addis Ababa' }]);
    expect(prisma.region.findMany).toHaveBeenCalledWith({
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true },
    });
  });

  it('filters zones by region ID', async () => {
    prisma.zoneCity.findMany.mockResolvedValue([]);
    await service.getZones('region-1');
    expect(prisma.zoneCity.findMany).toHaveBeenCalledWith({
      where: { regionId: 'region-1' },
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true, regionId: true },
    });
  });

  it('filters subcities and districts by their immediate parent', async () => {
    prisma.subcityTown.findMany.mockResolvedValue([]);
    prisma.district.findMany.mockResolvedValue([]);
    await service.getSubcities('zone-1');
    await service.getDistricts('subcity-1');
    expect(prisma.subcityTown.findMany).toHaveBeenCalledWith({
      where: { zoneId: 'zone-1' },
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true, zoneId: true },
    });
    expect(prisma.district.findMany).toHaveBeenCalledWith({
      where: { subcityId: 'subcity-1' },
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true, subcityId: true },
    });
  });

  it('rejects an explicitly empty parent filter', async () => {
    await expect(service.getZones('   ')).rejects.toThrow('parentId must not be empty');
  });
});
