import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createOpaqueToken } from '../auth/crypto';
import { PrismaService } from '../prisma.service';
import { ChapaInitializeInput, PaymentInput, RegistrationKind, RegistrationPaymentMethod } from './payment.types';
import { PaymentSettingsService } from './payment-settings.service';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { NotificationsService } from '../notifications/notifications.service';

const METHODS: RegistrationPaymentMethod[] = ['TELEBIRR', 'CHAPA', 'BANK_TRANSFER'];

type JsonObject = Record<string, unknown>;

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService, private readonly settings: PaymentSettingsService, private readonly authorization: AuthorizationService, private readonly notifications: NotificationsService) {}

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
      if ((payment?.status === 'INITIATED' || payment?.status === 'PENDING') && checkoutUrl) return { method: 'CHAPA', referenceNumber: payment.referenceNumber, amount, currency: 'ETB', checkoutUrl };
      if (payment?.status === 'PENDING') return { alreadyPending: true, status: await this.statusForApplication(input.kind, input.applicationId) };
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
      await this.prisma.$executeRaw`UPDATE "RegistrationPayment" SET "status"='PAID', "providerReference"=${paymentData?.reference ?? null}, "verifiedAt"=CURRENT_TIMESTAMP, "updatedAt"=CURRENT_TIMESTAMP WHERE "referenceNumber"=${ref} AND "method"='CHAPA'`;
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
    const paymentStatus = typeof payment?.status === 'string' ? payment.status : undefined;
    if (payment && (paymentStatus === 'INITIATED' || paymentStatus === 'PENDING') && payment.method === 'CHAPA') {
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
      status: typeof payment?.status === 'string' ? payment.status : (amount > 0 ? 'REQUIRED' : 'NOT_REQUIRED'),
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
      return this.initializeChapa({ kind, applicationId: app.id, firstName: app.firstName ?? undefined, lastName: app.lastName ?? undefined, email: app.email ?? undefined, ...(app.phone ? { phone: app.phone } : {}), trackingCode: code });
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

  private async paymentScope(id: string) {
    const rows = await this.prisma.$queryRaw<Array<{ id: string; method: RegistrationPaymentMethod; registrationId: string | null; institutionApplicationId: string | null; regionId: string | null; zoneId: string | null; subcityId: string | null; districtId: string | null }>>`
      SELECT p."id",p."method",p."registrationId",p."institutionApplicationId",
        COALESCE(r."regionId",ia."regionId") AS "regionId",
        COALESCE(r."zoneId",ia."zoneId") AS "zoneId",
        COALESCE(r."subcityId",ia."subcityId") AS "subcityId",
        COALESCE(r."districtId",ia."districtId") AS "districtId"
      FROM "RegistrationPayment" p
      LEFT JOIN "Registration" r ON r."id"=p."registrationId"
      LEFT JOIN "InstitutionApplication" ia ON ia."id"=p."institutionApplicationId"
      WHERE p."id"=${id}::uuid LIMIT 1`;
    return rows[0] ?? null;
  }

  async queue(user: AuthenticatedUser, filters?: { status?: string; method?: string; search?: string }) {
    const allowed = ['SUPER_ADMIN','NATIONAL_ADMIN','REGIONAL_ADMIN','ZONE_ADMIN','DISTRICT_ADMIN','REGISTRAR','FINANCE_OFFICER'];
    if (!user.roles.some((role) => allowed.includes(role))) throw new ForbiddenException('Payment review permission required');
    const status = filters?.status?.trim().toUpperCase();
    const method = filters?.method?.trim().toUpperCase();
    const search = filters?.search?.trim();
    const rows = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT p."id",p."method",p."amount",p."currency",p."referenceNumber",p."providerReference",p."status",
        p."submittedAt",p."verifiedAt",p."verifiedBy",p."rejectionReason",p."metadata",
        r."trackingCode" AS "individualTrackingCode",r."firstName",r."lastName",r."email" AS "individualEmail",r."phone" AS "individualPhone",
        r."regionId" AS "registrationRegionId",r."zoneId" AS "registrationZoneId",r."subcityId" AS "registrationSubcityId",r."districtId" AS "registrationDistrictId",
        ia."trackingCode" AS "institutionTrackingCode",ia."institutionName",ia."email" AS "institutionEmail",ia."phone" AS "institutionPhone",
        ia."regionId" AS "institutionRegionId",ia."zoneId" AS "institutionZoneId",ia."subcityId" AS "institutionSubcityId",ia."districtId" AS "institutionDistrictId"
      FROM "RegistrationPayment" p
      LEFT JOIN "Registration" r ON r."id"=p."registrationId"
      LEFT JOIN "InstitutionApplication" ia ON ia."id"=p."institutionApplicationId"
      WHERE (${status ?? null}::text IS NULL OR p."status"::text=${status})
        AND (${method ?? null}::text IS NULL OR p."method"::text=${method})
        AND (${search ?? null}::text IS NULL OR COALESCE(r."trackingCode",ia."trackingCode",'') ILIKE '%' || ${search ?? ''} || '%' OR COALESCE(r."firstName" || ' ' || r."lastName",ia."institutionName",'') ILIKE '%' || ${search ?? ''} || '%' OR p."referenceNumber" ILIKE '%' || ${search ?? ''} || '%')
      ORDER BY p."submittedAt" DESC NULLS LAST, p."createdAt" DESC LIMIT 500`;
    const visible = [];
    for (const row of rows) {
      if (await this.authorization.canAccess(user, { regionId: (row.registrationRegionId ?? row.institutionRegionId) as string | null, zoneId: (row.registrationZoneId ?? row.institutionZoneId) as string | null, subcityId: (row.registrationSubcityId ?? row.institutionSubcityId) as string | null, districtId: (row.registrationDistrictId ?? row.institutionDistrictId) as string | null })) visible.push(row);
    }
    return visible;
  }

  async detail(id: string, user: AuthenticatedUser) {
    const scope = await this.paymentScope(id);
    if (!scope) throw new NotFoundException('Payment not found');
    await this.authorization.assertCanAccess(user, { regionId: scope.regionId, zoneId: scope.zoneId, subcityId: scope.subcityId, districtId: scope.districtId });
    const payment = (await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT * FROM "RegistrationPayment" WHERE "id"=${id}::uuid LIMIT 1`)[0];
    const history = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT * FROM "RegistrationPayment"
      WHERE ("registrationId"=${scope.registrationId}::uuid OR "institutionApplicationId"=${scope.institutionApplicationId}::uuid)
      ORDER BY "createdAt" DESC`;
    let application: Record<string, unknown> | null = null;
    let attachments: Array<Record<string, unknown>> = [];
    if (scope.registrationId) {
      application = (await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
        SELECT r.*, m."id" AS "memberId", m."membershipNumber"
        FROM "Registration" r LEFT JOIN "Member" m ON m."id"=r."memberId"
        WHERE r."id"=${scope.registrationId}::uuid LIMIT 1`)[0] ?? null;
    } else if (scope.institutionApplicationId) {
      application = (await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
        SELECT ia.*, it."name" AS "institutionTypeName"
        FROM "InstitutionApplication" ia
        LEFT JOIN "InstitutionType" it ON it."id"=ia."institutionTypeId"
        WHERE ia."id"=${scope.institutionApplicationId}::uuid LIMIT 1`)[0] ?? null;
      attachments = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
        SELECT "id","documentType","fileName","storageKey","mimeType","size","uploadedBy","createdAt"
        FROM "InstitutionDocument" WHERE "institutionApplicationId"=${scope.institutionApplicationId}::uuid ORDER BY "createdAt" ASC`;
    }
    const audits = await this.prisma.auditLog.findMany({
      where: { entityType: 'RegistrationPayment', entityId: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { payment, application, attachments, history, auditHistory: audits };
  }

  async detailForReview(kind: 'INDIVIDUAL' | 'INSTITUTION', applicationId: string) {
    const payments = kind === 'INDIVIDUAL'
      ? await this.prisma.$queryRaw<Array<Record<string, unknown>>>`SELECT * FROM "RegistrationPayment" WHERE "registrationId"=${applicationId}::uuid ORDER BY "createdAt" DESC`
      : await this.prisma.$queryRaw<Array<Record<string, unknown>>>`SELECT * FROM "RegistrationPayment" WHERE "institutionApplicationId"=${applicationId}::uuid ORDER BY "createdAt" DESC`;
    const paymentIds = payments.map((p) => String(p.id));
    const audits = paymentIds.length ? await this.prisma.auditLog.findMany({ where: { entityType: 'RegistrationPayment', entityId: { in: paymentIds } }, orderBy: { createdAt: 'desc' }, take: 200 }) : [];
    const attachments = kind === 'INDIVIDUAL'
      ? await this.prisma.registrationDocument.findMany({ where: { registrationId: applicationId }, orderBy: { createdAt: 'asc' } })
      : await this.prisma.institutionDocument.findMany({ where: { institutionApplicationId: applicationId }, orderBy: { createdAt: 'asc' } });
    return { payments, latest: payments[0] ?? null, attachments, auditHistory: audits };
  }

  async review(id: string, user: AuthenticatedUser, decision: 'VERIFY' | 'REJECT' | 'CLARIFICATION', reason?: string) {
    if (!user.roles.some((role) => role === 'REGISTRAR' || role === 'FINANCE_OFFICER')) throw new ForbiddenException('Only Registrar or Finance Officer can decide payment verification');
    const scope = await this.paymentScope(id);
    if (!scope) throw new NotFoundException('Payment not found');
    await this.authorization.assertCanAccess(user, { regionId: scope.regionId, zoneId: scope.zoneId, subcityId: scope.subcityId, districtId: scope.districtId });
    if (scope.method === 'CHAPA') throw new BadRequestException('Chapa payments are verified automatically');
    const current = await this.prisma.$queryRaw<Array<{ status: string }>>`SELECT "status" FROM "RegistrationPayment" WHERE "id"=${id}::uuid LIMIT 1`;
    if (current[0]?.status !== 'PENDING') throw new ConflictException('Only pending manual payments can be reviewed');
    const cleanReason = reason?.trim() ?? '';
    if ((decision === 'REJECT' || decision === 'CLARIFICATION') && cleanReason.length < 3) throw new BadRequestException('A reason is required for rejection or clarification');
    const nextStatus = decision === 'VERIFY' ? 'PAID' : decision === 'REJECT' ? 'REJECTED' : 'PENDING';
    const metadata = decision === 'CLARIFICATION' ? { reviewState: 'CLARIFICATION_REQUIRED', clarificationReason: cleanReason } : { reviewState: decision };
    const userId = user.id;
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`UPDATE "RegistrationPayment" SET
        "status"=${nextStatus}::"RegistrationPaymentStatus",
        "verifiedBy"=${userId}::uuid,
        "verifiedAt"=CURRENT_TIMESTAMP,
        "rejectionReason"=${decision === 'REJECT' ? cleanReason : null},
        "metadata"=COALESCE("metadata",'{}'::jsonb) || ${JSON.stringify(metadata)}::jsonb,
        "updatedAt"=CURRENT_TIMESTAMP
        WHERE "id"=${id}::uuid`;
      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: decision === 'VERIFY' ? 'PAYMENT_VERIFIED' : decision === 'REJECT' ? 'PAYMENT_REJECTED' : 'PAYMENT_CLARIFICATION_REQUESTED',
          entityType: 'RegistrationPayment',
          entityId: id,
          metadata: { decision, reason: cleanReason || null, status: nextStatus },
        },
      });
    });
    const recipientRows = scope.registrationId
      ? await this.prisma.$queryRaw<Array<{ userId: string }>>`SELECT u."id" AS "userId" FROM "User" u JOIN "Member" m ON (u."email"=m."email" OR u."phone"=m."phone") JOIN "Registration" r ON r."memberId"=m."id" WHERE r."id"=${scope.registrationId}::uuid LIMIT 1`
      : await this.prisma.$queryRaw<Array<{ userId: string }>>`SELECT u."id" AS "userId" FROM "User" u JOIN "Institution" i ON u."institutionId"=i."id" JOIN "InstitutionApplication" ia ON ia."institutionId"=i."id" WHERE ia."id"=${scope.institutionApplicationId}::uuid LIMIT 1`;
    const notificationTarget = recipientRows[0]?.userId;
    if (notificationTarget) {
      const title = decision === 'VERIFY' ? 'Payment verified' : decision === 'REJECT' ? 'Payment rejected' : 'Payment clarification required';
      const message = decision === 'VERIFY'
        ? 'Your registration payment has been verified. You may continue with the application.'
        : decision === 'REJECT'
          ? `Your registration payment was rejected. Reason: ${cleanReason}`
          : `Please clarify your registration payment. Reason: ${cleanReason}`;
      await this.notifications.notifyEvent(notificationTarget, {
        type: decision === 'VERIFY' ? 'PAYMENT_VERIFIED' : decision === 'REJECT' ? 'PAYMENT_REJECTED' : 'PAYMENT_CLARIFICATION_REQUIRED',
        title,
        message,
        metadata: { paymentId: id, reason: cleanReason || null },
      });
    }
    return {
      ...(await this.detail(id, user)),
      notificationTargetFound: Boolean(recipientRows[0]),
      notificationAction: decision === 'VERIFY' ? 'Payment verified' : decision === 'REJECT' ? 'Payment rejected' : 'Clarification requested',
    };
  }
  async assertPaid(kind: RegistrationKind, applicationId: string) {
    const rows = kind === 'INDIVIDUAL'
      ? await this.prisma.$queryRaw<Array<{ status: string }>>`SELECT "status" FROM "RegistrationPayment" WHERE "registrationId"=${applicationId}::uuid ORDER BY "createdAt" DESC LIMIT 1`
      : await this.prisma.$queryRaw<Array<{ status: string }>>`SELECT "status" FROM "RegistrationPayment" WHERE "institutionApplicationId"=${applicationId}::uuid ORDER BY "createdAt" DESC LIMIT 1`;
    if (!rows[0] || rows[0].status !== 'PAID') throw new BadRequestException('Registration fee must be verified before approval');
  }
}
