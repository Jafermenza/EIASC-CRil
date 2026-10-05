import { BadRequestException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  const prisma = {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    $transaction: jest.fn(),
    auditLog: { create: jest.fn() },
  } as any;
  const settings = {
    getPublic: jest.fn(),
  } as any;
  const authorization = {
    assertCanAccess: jest.fn(),
    canAccess: jest.fn().mockResolvedValue(true),
  } as any;
  const notifications = { notifyEvent: jest.fn() } as any;
  let service: PaymentsService;

  beforeEach(() => {
    jest.resetAllMocks();
    settings.getPublic.mockResolvedValue({ individual: 100, institution: 500, banks: [{ id: 'bank-1', bankName: 'Test Bank', accountName: 'EIASC', accountNumber: '123', branch: null }] });
    service = new PaymentsService(prisma, settings, authorization, notifications);
    delete process.env.CHAPA_SECRET_KEY;
  });

  it('exposes configured registration fees and supported methods', async () => {
    await expect(service.fees()).resolves.toMatchObject({ individual: 100, institution: 500, currency: 'ETB', methods: ['TELEBIRR', 'CHAPA', 'BANK_TRANSFER'] });
  });

  it('rejects submission without a payment reference', async () => {
    await expect(service.validateForSubmission('INDIVIDUAL', { method: 'BANK_TRANSFER', referenceNumber: '' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows manual payment submission as pending', async () => {
    const result = await service.validateForSubmission('INSTITUTION', { method: 'TELEBIRR', referenceNumber: 'TB-12345' });
    expect(result).toMatchObject({ method: 'TELEBIRR', referenceNumber: 'TB-12345', amount: 500 });
  });

  it('rejects manual review of Chapa payments', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ id: '1', method: 'CHAPA', registrationId: 'r1', institutionApplicationId: null, regionId: null, zoneId: null, subcityId: null, districtId: null }]);
    await expect(service.review('1', { id: 'user-1', email: null, phone: null, status: 'ACTIVE', roles: ['FINANCE_OFFICER'] as any, jurisdictionLevel: 'NATIONAL' as any, jurisdictionId: null, institutionId: null }, 'VERIFY')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks approval when the linked payment is not paid', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ status: 'PENDING' }]);
    await expect(service.assertPaid('INSTITUTION', 'app-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows approval when the linked payment is paid', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ status: 'PAID' }]);
    await expect(service.assertPaid('INSTITUTION', 'app-1')).resolves.toBeUndefined();
  });

  it('reports payment as required when no payment exists', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([]);
    await expect(service.statusForApplication('INDIVIDUAL', 'app-1')).resolves.toMatchObject({ status: 'REQUIRED', required: true, amount: 100 });
  });

  it('requires a reason for payment rejection or clarification', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ id: 'p1', method: 'TELEBIRR', registrationId: 'r1', institutionApplicationId: null, regionId: null, zoneId: null, subcityId: null, districtId: null }]);
    await expect(service.review('p1', { id: 'u1', email: null, phone: null, status: 'ACTIVE', roles: ['FINANCE_OFFICER'] as any, jurisdictionLevel: 'NATIONAL' as any, jurisdictionId: null, institutionId: null }, 'REJECT')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a payment clarification decision only with a reason', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ id: 'p1', method: 'TELEBIRR', registrationId: 'r1', institutionApplicationId: null, regionId: null, zoneId: null, subcityId: null, districtId: null }]);
    prisma.$transaction.mockImplementation(async (fn: any) => fn({ $executeRaw: jest.fn(), auditLog: { create: jest.fn() } }));
    prisma.$queryRaw.mockResolvedValueOnce([]);
    jest.spyOn(service, 'detail').mockResolvedValue({} as any);
    await expect(service.review('p1', { id: 'u1', email: null, phone: null, status: 'ACTIVE', roles: ['FINANCE_OFFICER'] as any, jurisdictionLevel: 'NATIONAL' as any, jurisdictionId: null, institutionId: null }, 'CLARIFICATION', 'Please provide a clearer receipt')).resolves.toBeDefined();
    expect(notifications.notifyEvent).not.toHaveBeenCalled();
  });

  it('reports a pending payment without treating it as verified', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ id: 'p1', status: 'PENDING', method: 'TELEBIRR', amount: 100, referenceNumber: 'TB-1' }]);
    await expect(service.statusForApplication('INDIVIDUAL', 'app-1')).resolves.toMatchObject({ status: 'PENDING', required: true });
  });
});
