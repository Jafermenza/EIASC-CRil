import { LocationsService } from './locations.service';

describe('LocationsService', () => {
  const prisma = {
    region: { findMany: jest.fn() },
    zoneCity: { findMany: jest.fn(), findUnique: jest.fn() },
    subcityTown: { findMany: jest.fn(), findUnique: jest.fn() },
    district: { findMany: jest.fn(), findUnique: jest.fn() },
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
      select: { id: true, code: true, name: true, subcityId: true, zoneId: true },
    });
  });

  it('validates the complete region-to-district chain through a subcity', async () => {
    prisma.zoneCity.findUnique.mockResolvedValue({ id: 'zone-1', regionId: 'region-1' });
    prisma.district.findUnique.mockResolvedValue({ id: 'district-1', zoneId: null, subcityId: 'subcity-1' });
    prisma.subcityTown.findUnique.mockResolvedValue({ id: 'subcity-1', zoneId: 'zone-1' });
    await expect(
      service.validateHierarchy({ regionId: 'region-1', zoneId: 'zone-1', subcityId: 'subcity-1', districtId: 'district-1' }),
    ).resolves.toBeUndefined();
  });

  it('rejects a cross-parent hierarchy', async () => {
    prisma.zoneCity.findUnique.mockResolvedValue({ id: 'zone-1', regionId: 'region-A' });
    await expect(
      service.validateHierarchy({ regionId: 'region-B', zoneId: 'zone-1', subcityId: 'subcity-1', districtId: 'district-1' }),
    ).rejects.toThrow('Location hierarchy is invalid');
  });

  it('validates a district directly under a zone', async () => {
    prisma.zoneCity.findUnique.mockResolvedValue({ id: 'zone-1', regionId: 'region-1' });
    prisma.district.findUnique.mockResolvedValue({ id: 'district-1', zoneId: 'zone-1', subcityId: null });
    await expect(
      service.validateHierarchy({ regionId: 'region-1', zoneId: 'zone-1', districtId: 'district-1' }),
    ).resolves.toBeUndefined();
  });

  it('rejects an explicitly empty parent filter', async () => {
    await expect(service.getZones('   ')).rejects.toThrow('parentId must not be empty');
  });
});
