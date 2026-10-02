import { BadRequestException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  const prisma = {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
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
    jest.clearAllMocks();
    settings.getPublic.mockResolvedValue({ individual: 100, institution: 500, banks: [{ id: 'bank-1', bankName: 'Test Bank', accountName: 'EIASC', accountNumber: '123', branch: null }] });
    service = new PaymentsService(prisma, settings, authorization);
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

  it('rejects manual verification of Chapa payments', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ id: '1', method: 'CHAPA' }]);
    await expect(service.verifyManual('1', 'user-1', true)).rejects.toBeInstanceOf(BadRequestException);
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

  it('reports a pending payment without treating it as verified', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ id: 'p1', status: 'PENDING', method: 'TELEBIRR', amount: 100, referenceNumber: 'TB-1' }]);
    await expect(service.statusForApplication('INDIVIDUAL', 'app-1')).resolves.toMatchObject({ status: 'PENDING', required: true });
  });
});
