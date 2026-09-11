import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createOpaqueToken } from '../auth/crypto';
import { PrismaService } from '../prisma.service';
import { ChapaInitializeInput, PaymentInput, RegistrationKind, RegistrationPaymentMethod } from './payment.types';
import { PaymentSettingsService } from './payment-settings.service';

const METHODS: RegistrationPaymentMethod[] = ['TELEBIRR', 'CHAPA', 'BANK_TRANSFER'];

type JsonObject = Record<string, unknown>;

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService, private readonly settings: PaymentSettingsService) {}

  private async fee(kind: RegistrationKind): Promise<number> {
    const config = await this.settings.getPublic();
    const value = kind === 'INDIVIDUAL' ? config.individual : config.institution;
    if (!Number.isFinite(value) || value < 0) throw new BadRequestException('Registration fee is not configured');
    return Number(value.toFixed(2));
  }

  async fees() {
    const config = await this.settings.getPublic();
    return {
      currency: 'ETB',
      individual: config.individual,
      institution: config.institution,
      methods: METHODS.filter((method) => method !== 'BANK_TRANSFER' || config.banks.length > 0),
      telebirr: { accountName: process.env.REGISTRATION_TELEBIRR_NAME ?? '', accountNumber: process.env.REGISTRATION_TELEBIRR_NUMBER ?? '' },
      banks: config.banks,
    };
  }

  private apiBase() { return (process.env.API_PUBLIC_URL ?? '').replace(/\/$/, ''); }
  private webBase() { return (process.env.WEB_PUBLIC_URL ?? process.env.FRONTEND_URL ?? '').replace(/\/$/, ''); }

  async initializeChapa(input: ChapaInitializeInput) {
    if (!process.env.CHAPA_SECRET_KEY) throw new BadRequestException('Chapa API is not configured');
    const amount = await this.fee(input.kind);
    if (amount <= 0) throw new BadRequestException('Chapa checkout requires a positive registration fee');
    const returnPath = `/register/${input.kind === 'INDIVIDUAL' ? 'individual' : 'institution'}`;
    const txRef = `EIASC-${input.kind === 'INDIVIDUAL' ? 'MEM' : 'INST'}-${Date.now()}-${createOpaqueToken(5).toUpperCase()}`;
    const response = await fetch('https://api.chapa.co/v1/transaction/initialize', { method: 'POST', headers: { Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: String(amount), currency: 'ETB', email: input.email, first_name: input.firstName ?? input.name ?? 'EIASC', last_name: input.lastName ?? 'Applicant', phone_number: input.phone, tx_ref: txRef, callback_url: `${this.apiBase()}/api/v1/payments/chapa/callback`, return_url: `${this.webBase()}${returnPath}?payment_ref=${encodeURIComponent(txRef)}`, customization: { title: 'EIASC Registration', description: `${input.kind === 'INDIVIDUAL' ? 'Individual' : 'Institution'} registration fee` } }) });
    const data: JsonObject = await response.json().catch(() => ({}));
    const responseData = data.data as { checkout_url?: string } | undefined;
    if (!response.ok || data.status !== 'success' || !responseData?.checkout_url) throw new BadRequestException(typeof data.message === 'string' ? data.message : 'Chapa payment could not be initialized');
    await this.prisma.$executeRaw`INSERT INTO "RegistrationPayment" ("method","amount","currency","referenceNumber","status","intentToken","metadata","updatedAt") VALUES ('CHAPA', ${amount}, 'ETB', ${txRef}, 'INITIATED', ${createOpaqueToken(24)}, ${JSON.stringify({ kind: input.kind, returnPath })}::jsonb, CURRENT_TIMESTAMP)`;
    return { method: 'CHAPA', referenceNumber: txRef, amount, currency: 'ETB', checkoutUrl: responseData.checkout_url };
  }

  async verifyChapa(referenceNumber: string, expectedAmount?: number) {
    if (!process.env.CHAPA_SECRET_KEY) throw new BadRequestException('Chapa API is not configured');
    const ref = referenceNumber.trim();
    if (!ref) throw new BadRequestException('Chapa reference is required');
    const response = await fetch(`https://api.chapa.co/v1/transaction/verify/${encodeURIComponent(ref)}`, { headers: { Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}` } });
    const data: JsonObject = await response.json().catch(() => ({}));
    const paymentData = data.data as { status?: string; amount?: string | number; reference?: string } | undefined;
    if (!response.ok || data.status !== 'success' || paymentData?.status !== 'success') return { paid: false, data };
    if (expectedAmount !== undefined && Number(paymentData.amount) !== Number(expectedAmount)) throw new ConflictException('Chapa payment amount does not match the required registration fee');
    await this.prisma.$executeRaw`UPDATE "RegistrationPayment" SET "status"='PAID', "providerReference"=${paymentData.reference ?? null}, "verifiedAt"=CURRENT_TIMESTAMP, "updatedAt"=CURRENT_TIMESTAMP WHERE "referenceNumber"=${ref} AND "method"='CHAPA'`;
    return { paid: true, data: paymentData };
  }

  async callback(referenceNumber: string) {
    const payment = await this.prisma.$queryRaw<Array<{ id: string; amount: number; metadata: JsonObject | null }>>`SELECT "id","amount","metadata" FROM "RegistrationPayment" WHERE "referenceNumber"=${referenceNumber} AND "method"='CHAPA' LIMIT 1`;
    if (!payment[0]) throw new NotFoundException('Payment reference not found');
    const verified = await this.verifyChapa(referenceNumber, Number(payment[0].amount));
    return { ...verified, returnPath: typeof payment[0].metadata?.returnPath === 'string' ? payment[0].metadata.returnPath : '/register' };
  }

  async validateForSubmission(kind: RegistrationKind, input: PaymentInput) {
    if (!input || !METHODS.includes(input.method)) throw new BadRequestException('A supported payment method is required');
    if (input.method === 'BANK_TRANSFER') {
      const banks = (await this.settings.getPublic()).banks;
      if (!banks.length) throw new BadRequestException('Bank transfer is not currently configured');
    }
    const referenceNumber = input.referenceNumber?.trim();
    if (!referenceNumber) throw new BadRequestException('Payment reference number is required before submission');
    const amount = await this.fee(kind);
    if (input.method === 'CHAPA') {
      const verified = await this.verifyChapa(referenceNumber, amount);
      if (!verified.paid) throw new BadRequestException('Chapa payment is not confirmed. Complete the payment before submitting the application');
    }
    return { amount, referenceNumber, method: input.method, receiptUrl: input.receiptUrl?.trim() || null };
  }

  async attachToApplication(kind: RegistrationKind, applicationId: string, input: PaymentInput) {
    const payment = await this.validateForSubmission(kind, input);
    const existing = await this.prisma.$queryRaw<Array<{ id: string; status: string }>>`SELECT "id","status" FROM "RegistrationPayment" WHERE "referenceNumber"=${payment.referenceNumber} LIMIT 1`;
    if (existing[0]) {
      if (existing[0].status === 'PAID') {
        if (kind === 'INSTITUTION') await this.prisma.$executeRaw`UPDATE "RegistrationPayment" SET "institutionApplicationId"=${applicationId}::uuid,"receiptUrl"=${payment.receiptUrl},"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=${existing[0].id}::uuid`;
        else await this.prisma.$executeRaw`UPDATE "RegistrationPayment" SET "registrationId"=${applicationId}::uuid,"receiptUrl"=${payment.receiptUrl},"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=${existing[0].id}::uuid`;
      } else if (payment.method !== 'CHAPA') {
        if (kind === 'INSTITUTION') await this.prisma.$executeRaw`UPDATE "RegistrationPayment" SET "institutionApplicationId"=${applicationId}::uuid,"receiptUrl"=${payment.receiptUrl},"status"='PENDING',"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=${existing[0].id}::uuid`;
        else await this.prisma.$executeRaw`UPDATE "RegistrationPayment" SET "registrationId"=${applicationId}::uuid,"receiptUrl"=${payment.receiptUrl},"status"='PENDING',"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=${existing[0].id}::uuid`;
      }
    } else if (kind === 'INSTITUTION') {
      await this.prisma.$executeRaw`INSERT INTO "RegistrationPayment" ("institutionApplicationId","method","amount","currency","referenceNumber","status","receiptUrl","updatedAt") VALUES (${applicationId}::uuid,${payment.method}::"RegistrationPaymentMethod",${payment.amount},'ETB',${payment.referenceNumber},'PENDING',${payment.receiptUrl},CURRENT_TIMESTAMP)`;
    } else {
      await this.prisma.$executeRaw`INSERT INTO "RegistrationPayment" ("registrationId","method","amount","currency","referenceNumber","status","receiptUrl","updatedAt") VALUES (${applicationId}::uuid,${payment.method}::"RegistrationPaymentMethod",${payment.amount},'ETB',${payment.referenceNumber},'PENDING',${payment.receiptUrl},CURRENT_TIMESTAMP)`;
    }
    return this.getForApplication(kind, applicationId);
  }

  async getForApplication(kind: RegistrationKind, applicationId: string) {
    if (kind === 'INDIVIDUAL') return (await this.prisma.$queryRaw<Array<Record<string, unknown>>>`SELECT "id","method","amount","currency","referenceNumber","providerReference","status","receiptUrl","submittedAt","verifiedAt","verifiedBy","rejectionReason" FROM "RegistrationPayment" WHERE "registrationId"=${applicationId}::uuid ORDER BY "createdAt" DESC LIMIT 1`)[0] ?? null;
    return (await this.prisma.$queryRaw<Array<Record<string, unknown>>>`SELECT "id","method","amount","currency","referenceNumber","providerReference","status","receiptUrl","submittedAt","verifiedAt","verifiedBy","rejectionReason" FROM "RegistrationPayment" WHERE "institutionApplicationId"=${applicationId}::uuid ORDER BY "createdAt" DESC LIMIT 1`)[0] ?? null;
  }

  async queue(user: { roles: string[] }) {
    const allowed = ['SUPER_ADMIN','NATIONAL_ADMIN','REGIONAL_ADMIN','ZONE_ADMIN','DISTRICT_ADMIN','REGISTRAR','FINANCE_OFFICER','INSPECTOR'];
    if (!user.roles.some((role) => allowed.includes(role))) throw new ForbiddenException('Payment review permission required');
    return this.prisma.$queryRaw<Array<Record<string, unknown>>>`SELECT p."id",p."method",p."amount",p."currency",p."referenceNumber",p."providerReference",p."status",p."submittedAt",p."verifiedAt",p."rejectionReason",r."trackingCode" AS "individualTrackingCode",r."firstName",r."lastName",ia."trackingCode" AS "institutionTrackingCode",ia."institutionName" FROM "RegistrationPayment" p LEFT JOIN "Registration" r ON r."id"=p."registrationId" LEFT JOIN "InstitutionApplication" ia ON ia."id"=p."institutionApplicationId" ORDER BY p."submittedAt" DESC LIMIT 200`;
  }

  async verifyManual(id: string, userId: string, approve: boolean, reason?: string) {
    const rows = await this.prisma.$queryRaw<Array<{ id: string; method: RegistrationPaymentMethod }>>`SELECT "id","method" FROM "RegistrationPayment" WHERE "id"=${id}::uuid LIMIT 1`;
    if (!rows[0]) throw new NotFoundException('Payment not found');
    if (rows[0].method === 'CHAPA') throw new BadRequestException('Chapa payments are verified automatically');
    await this.prisma.$executeRaw`UPDATE "RegistrationPayment" SET "status"=${approve ? 'PAID' : 'REJECTED'}::"RegistrationPaymentStatus","verifiedBy"=${userId}::uuid,"verifiedAt"=CURRENT_TIMESTAMP,"rejectionReason"=${approve ? null : (reason?.trim() || 'Payment rejected')},"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=${id}::uuid`;
    return (await this.prisma.$queryRaw<Array<Record<string, unknown>>>`SELECT * FROM "RegistrationPayment" WHERE "id"=${id}::uuid LIMIT 1`)[0];
  }

  async assertPaid(kind: RegistrationKind, applicationId: string) {
    const rows = kind === 'INDIVIDUAL'
      ? await this.prisma.$queryRaw<Array<{ status: string }>>`SELECT "status" FROM "RegistrationPayment" WHERE "registrationId"=${applicationId}::uuid ORDER BY "createdAt" DESC LIMIT 1`
      : await this.prisma.$queryRaw<Array<{ status: string }>>`SELECT "status" FROM "RegistrationPayment" WHERE "institutionApplicationId"=${applicationId}::uuid ORDER BY "createdAt" DESC LIMIT 1`;
    if (!rows[0] || rows[0].status !== 'PAID') throw new BadRequestException('Registration fee must be verified before approval');
  }
}
