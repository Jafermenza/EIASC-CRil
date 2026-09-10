import { BadRequestException } from '@nestjs/common';
import { LocationsService } from './locations.service';

describe('Locations master data operations', () => {
  const prisma = {
    region: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    zoneCity: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    subcityTown: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    district: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const service = new LocationsService(prisma as never);
  const actor = { id: 'admin-1' } as never;

  beforeEach(() => jest.clearAllMocks());

  it('creates a region and writes an audit event', async () => {
    prisma.region.create.mockResolvedValue({ id: 'r1', code: 'R1', name: 'Region One' });
    prisma.auditLog.create.mockResolvedValue({});
    await expect(service.createRegion({ code: ' R1 ', name: ' Region One ' }, actor, 'req-1')).resolves.toEqual({ id: 'r1', code: 'R1', name: 'Region One' });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ actorUserId: 'admin-1', action: 'LOCATION_REGION_CREATED', entityType: 'Region', entityId: 'r1', requestId: 'req-1' }) });
  });

  it('rejects an empty Excel upload before database work', async () => {
    await expect(service.importExcel(Buffer.alloc(0), actor)).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects an oversized Excel upload before database work', async () => {
    await expect(service.importExcel(Buffer.alloc(5 * 1024 * 1024 + 1), actor)).rejects.toThrow('Excel file must not exceed 5 MB');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('generates an xlsx template', async () => {
    const buffer = await service.createTemplate();
    expect(buffer.subarray(0, 2).toString('hex')).toBe('504b');
  });
});
