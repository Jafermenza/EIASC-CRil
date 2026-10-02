import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createOpaqueToken } from '../auth/crypto';
import { PrismaService } from '../prisma.service';
import { ChapaInitializeInput, PaymentInput, RegistrationKind, RegistrationPaymentMethod } from './payment.types';
import { PaymentSettingsService } from './payment-settings.service';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthenticatedUser } from '../auth/auth.types';

const METHODS: RegistrationPaymentMethod[] = ['TELEBIRR', 'CHAPA', 'BANK_TRANSFER'];

type JsonObject = Record<string, unknown>;

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService, private readonly settings: PaymentSettingsService, private readonly authorization: AuthorizationService) {}

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
    const returnPath = input.applicationId
      ? `/track?code=${encodeURIComponent(input.trackingCode ?? '')}`
      : `/register/${input.kind === 'INDIVIDUAL' ? 'individual' : 'institution'}`;
    if (input.applicationId) {
      const existing = input.kind === 'INDIVIDUAL'
        ? await this.prisma.$queryRaw<Array<{ status: string; referenceNumber: string; metadata: JsonObject | null }>>`SELECT "status","referenceNumber","metadata" FROM "RegistrationPayment" WHERE "registrationId"=${input.applicationId}::uuid ORDER BY "createdAt" DESC LIMIT 1`
        : await this.prisma.$queryRaw<Array<{ status: string; referenceNumber: string; metadata: JsonObject | null }>>`SELECT "status","referenceNumber","metadata" FROM "RegistrationPayment" WHERE "institutionApplicationId"=${input.applicationId}::uuid ORDER BY "createdAt" DESC LIMIT 1`;
      const payment = existing[0];
      const checkoutUrl = typeof payment?.metadata?.checkoutUrl === 'string' ? payment.metadata.checkoutUrl : undefined;
      if (payment?.status === 'PAID') return { alreadyPaid: true, status: await this.statusForApplication(input.kind, input.applicationId) };
      if (payment?.status === 'INITIATED' && checkoutUrl) return { method: 'CHAPA', referenceNumber: payment.referenceNumber, amount, currency: 'ETB', checkoutUrl };
    }
    const txRef = `EIASC-${input.kind === 'INDIVIDUAL' ? 'MEM' : 'INST'}-${Date.now()}-${createOpaqueToken(5).toUpperCase()}`;
    const response = await fetch('https://api.chapa.co/v1/transaction/initialize', { method: 'POST', headers: { Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: String(amount), currency: 'ETB', email: input.email, first_name: input.firstName ?? input.name ?? 'EIASC', last_name: input.lastName ?? 'Applicant', phone_number: input.phone, tx_ref: txRef, callback_url: `${this.apiBase()}/api/v1/payments/chapa/callback`, return_url: `${this.webBase()}${returnPath}?payment_ref=${encodeURIComponent(txRef)}`, customization: { title: 'EIASC Registration', description: `${input.kind === 'INDIVIDUAL' ? 'Individual' : 'Institution'} registration fee` } }) });
    const data: JsonObject = await response.json().catch(() => ({}));
    const responseData = data.data as { checkout_url?: string } | undefined;
    if (!response.ok || data.status !== 'success' || !responseData?.checkout_url) throw new BadRequestException(typeof data.message === 'string' ? data.message : 'Chapa payment could not be initialized');
    await this.prisma.$executeRaw`INSERT INTO "RegistrationPayment" ("registrationId","institutionApplicationId","method","amount","currency","referenceNumber","status","intentToken","metadata","updatedAt") VALUES (${input.kind === 'INDIVIDUAL' && input.applicationId ? input.applicationId : null}::uuid, ${input.kind === 'INSTITUTION' && input.applicationId ? input.applicationId : null}::uuid, 'CHAPA', ${amount}, 'ETB', ${txRef}, 'INITIATED', ${createOpaqueToken(24)}, ${JSON.stringify({ kind: input.kind, returnPath, checkoutUrl: responseData.checkout_url })}::jsonb, CURRENT_TIMESTAMP)`;
    return { method: 'CHAPA', referenceNumber: txRef, amount, currency: 'ETB', checkoutUrl: responseData.checkout_url };
  }

  async verifyChapa(referenceNumber: string, expectedAmount?: number) {
    if (!process.env.CHAPA_SECRET_KEY) throw new BadRequestException('Chapa API is not configured');
    const ref = referenceNumber.trim();
    if (!ref) throw new BadRequestException('Chapa reference is required');
    const response = await fetch(`https://api.chapa.co/v1/transaction/verify/${encodeURIComponent(ref)}`, { headers: { Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}` } });
    const data: JsonObject = await response.json().catch(() => ({}));
    const paymentData = data.data as { status?: string; amount?: string | number; reference?: string } | undefined;
    if (!response.ok || data.status !== 'success') return { paid: false, data };
    const providerStatus = String(paymentData?.status ?? '').toLowerCase();
    if (providerStatus === 'success') {
      if (expectedAmount !== undefined && Number(paymentData?.amount) !== Number(expectedAmount)) throw new ConflictException('Chapa payment amount does not match the required registration fee');
      await this.prisma.$executeRaw`UPDATE "RegistrationPayment" SET "status"='PAID', "providerReference"=${paymentData.reference ?? null}, "verifiedAt"=CURRENT_TIMESTAMP, "updatedAt"=CURRENT_TIMESTAMP WHERE "referenceNumber"=${ref} AND "method"='CHAPA'`;
      return { paid: true, data: paymentData };
    }
    if (['failed', 'cancelled', 'canceled', 'expired'].includes(providerStatus)) {
      await this.prisma.$executeRaw`UPDATE "RegistrationPayment" SET "status"='FAILED', "updatedAt"=CURRENT_TIMESTAMP WHERE "referenceNumber"=${ref} AND "method"='CHAPA'`;
    } else if (['pending', 'processing', 'initiated'].includes(providerStatus)) {
      await this.prisma.$executeRaw`UPDATE "RegistrationPayment" SET "status"='PENDING', "updatedAt"=CURRENT_TIMESTAMP WHERE "referenceNumber"=${ref} AND "method"='CHAPA'`;
    }
    return { paid: false, data: paymentData };
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
    const existing = await this.prisma.$queryRaw<Array<{ id: string; status: string; registrationId: string | null; institutionApplicationId: string | null }>>`SELECT "id","status","registrationId","institutionApplicationId" FROM "RegistrationPayment" WHERE "referenceNumber"=${payment.referenceNumber} LIMIT 1`;
    if (existing[0] && ((kind === 'INDIVIDUAL' && existing[0].institutionApplicationId && existing[0].institutionApplicationId !== applicationId) || (kind === 'INSTITUTION' && existing[0].registrationId && existing[0].registrationId !== applicationId))) {
      throw new ConflictException('This payment reference is already linked to another application');
    }
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

  async refreshForApplication(kind: RegistrationKind, applicationId: string) {
    const payment = await this.getForApplication(kind, applicationId);
    if (payment && payment.status === 'INITIATED' && payment.method === 'CHAPA') {
      await this.verifyChapa(String(payment.referenceNumber), Number(payment.amount));
      return this.getForApplication(kind, applicationId);
    }
    return payment;
  }

  async statusForApplication(kind: RegistrationKind, applicationId: string) {
    const payment = await this.refreshForApplication(kind, applicationId);
    const amount = await this.fee(kind);
    return {
      required: amount > 0,
      amount,
      currency: 'ETB',
      status: payment?.status ?? (amount > 0 ? 'REQUIRED' : 'NOT_REQUIRED'),
      payment: payment ?? null,
      nextAction: payment?.status === 'PAID' ? 'Payment verified. Continue with the application.' : payment?.status === 'PENDING' || payment?.status === 'INITIATED' ? 'Payment is awaiting verification.' : payment?.status === 'REJECTED' ? 'Payment was rejected. Pay again or submit a new payment reference.' : amount > 0 ? 'Payment is required. Use Pay Now to continue.' : 'No payment is required.'
    };
  }

  async initializeForApplication(kind: RegistrationKind, trackingCode: string) {
    const code = trackingCode.trim().toUpperCase();
    if (kind === 'INDIVIDUAL') {
      const app = await this.prisma.registration.findUnique({ where: { trackingCode: code }, select: { id: true, firstName: true, lastName: true, email: true, phone: true } });
      if (!app) throw new NotFoundException('Application not found');
      const status = await this.statusForApplication(kind, app.id);
      if (status.status === 'PAID') return { alreadyPaid: true, status };
      return this.initializeChapa({ kind, applicationId: app.id, firstName: app.firstName ?? undefined, lastName: app.lastName ?? undefined, email: app.email ?? undefined, phone: app.phone, trackingCode: code });
    }
    const app = await this.prisma.institutionApplication.findUnique({ where: { trackingCode: code }, select: { id: true, institutionName: true, email: true, phone: true } });
    if (!app) throw new NotFoundException('Application not found');
    const status = await this.statusForApplication(kind, app.id);
    if (status.status === 'PAID') return { alreadyPaid: true, status };
    return this.initializeChapa({ kind, applicationId: app.id, name: app.institutionName, email: app.email, phone: app.phone, trackingCode: code });
  }

  async getForApplication(kind: RegistrationKind, applicationId: string) {
    if (kind === 'INDIVIDUAL') return (await this.prisma.$queryRaw<Array<Record<string, unknown>>>`SELECT "id","method","amount","currency","referenceNumber","providerReference","status","receiptUrl","submittedAt","verifiedAt","verifiedBy","rejectionReason" FROM "RegistrationPayment" WHERE "registrationId"=${applicationId}::uuid ORDER BY "createdAt" DESC LIMIT 1`)[0] ?? null;
    return (await this.prisma.$queryRaw<Array<Record<string, unknown>>>`SELECT "id","method","amount","currency","referenceNumber","providerReference","status","receiptUrl","submittedAt","verifiedAt","verifiedBy","rejectionReason" FROM "RegistrationPayment" WHERE "institutionApplicationId"=${applicationId}::uuid ORDER BY "createdAt" DESC LIMIT 1`)[0] ?? null;
  }

  async queue(user: AuthenticatedUser) {
    const allowed = ['SUPER_ADMIN','NATIONAL_ADMIN','REGIONAL_ADMIN','ZONE_ADMIN','DISTRICT_ADMIN','REGISTRAR','FINANCE_OFFICER','INSPECTOR'];
    if (!user.roles.some((role) => allowed.includes(role))) throw new ForbiddenException('Payment review permission required');
    const rows = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`SELECT p."id",p."method",p."amount",p."currency",p."referenceNumber",p."providerReference",p."status",p."submittedAt",p."verifiedAt",p."rejectionReason",r."trackingCode" AS "individualTrackingCode",r."firstName",r."lastName",r."regionId" AS "registrationRegionId",r."zoneId" AS "registrationZoneId",r."subcityId" AS "registrationSubcityId",r."districtId" AS "registrationDistrictId",ia."trackingCode" AS "institutionTrackingCode",ia."institutionName",ia."regionId" AS "institutionRegionId",ia."zoneId" AS "institutionZoneId",ia."subcityId" AS "institutionSubcityId",ia."districtId" AS "institutionDistrictId" FROM "RegistrationPayment" p LEFT JOIN "Registration" r ON r."id"=p."registrationId" LEFT JOIN "InstitutionApplication" ia ON ia."id"=p."institutionApplicationId" ORDER BY p."submittedAt" DESC LIMIT 200`;
    const visible = [];
    for (const row of rows) {
      if (await this.authorization.canAccess(user, { regionId: (row.registrationRegionId ?? row.institutionRegionId) as string | null, zoneId: (row.registrationZoneId ?? row.institutionZoneId) as string | null, subcityId: (row.registrationSubcityId ?? row.institutionSubcityId) as string | null, districtId: (row.registrationDistrictId ?? row.institutionDistrictId) as string | null })) visible.push(row);
    }
    return visible;
  }

  async verifyManual(id: string, userOrId: AuthenticatedUser | string, approve: boolean, reason?: string) {
    const rows = await this.prisma.$queryRaw<Array<{ id: string; method: RegistrationPaymentMethod; registrationRegionId: string | null; registrationZoneId: string | null; registrationSubcityId: string | null; registrationDistrictId: string | null; institutionRegionId: string | null; institutionZoneId: string | null; institutionSubcityId: string | null; institutionDistrictId: string | null }>>`SELECT p."id",p."method",r."regionId" AS "registrationRegionId",r."zoneId" AS "registrationZoneId",r."subcityId" AS "registrationSubcityId",r."districtId" AS "registrationDistrictId",ia."regionId" AS "institutionRegionId",ia."zoneId" AS "institutionZoneId",ia."subcityId" AS "institutionSubcityId",ia."districtId" AS "institutionDistrictId" FROM "RegistrationPayment" p LEFT JOIN "Registration" r ON r."id"=p."registrationId" LEFT JOIN "InstitutionApplication" ia ON ia."id"=p."institutionApplicationId" WHERE p."id"=${id}::uuid LIMIT 1`;
    if (!rows[0]) throw new NotFoundException('Payment not found');
    if (rows[0].method === 'CHAPA') throw new BadRequestException('Chapa payments are verified automatically');
    if (typeof userOrId !== 'string') await this.authorization.assertCanAccess(userOrId, { regionId: rows[0].registrationRegionId ?? rows[0].institutionRegionId, zoneId: rows[0].registrationZoneId ?? rows[0].institutionZoneId, subcityId: rows[0].registrationSubcityId ?? rows[0].institutionSubcityId, districtId: rows[0].registrationDistrictId ?? rows[0].institutionDistrictId });
    const userId = typeof userOrId === 'string' ? userOrId : userOrId.id;
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
