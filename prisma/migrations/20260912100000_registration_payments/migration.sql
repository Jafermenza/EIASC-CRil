CREATE TYPE "RegistrationPaymentMethod" AS ENUM ('TELEBIRR', 'CHAPA', 'BANK_TRANSFER');
CREATE TYPE "RegistrationPaymentStatus" AS ENUM ('INITIATED', 'PENDING', 'PAID', 'REJECTED', 'FAILED');

CREATE TABLE "RegistrationPayment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "registrationId" UUID,
  "institutionApplicationId" UUID,
  "method" "RegistrationPaymentMethod" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ETB',
  "referenceNumber" TEXT NOT NULL,
  "providerReference" TEXT,
  "status" "RegistrationPaymentStatus" NOT NULL DEFAULT 'PENDING',
  "intentToken" TEXT,
  "receiptUrl" TEXT,
  "metadata" JSONB,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "verifiedAt" TIMESTAMP(3),
  "verifiedBy" UUID,
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RegistrationPayment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RegistrationPayment_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RegistrationPayment_institutionApplicationId_fkey" FOREIGN KEY ("institutionApplicationId") REFERENCES "InstitutionApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RegistrationPayment_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "RegistrationPayment_one_application_check" CHECK ((CASE WHEN "registrationId" IS NOT NULL THEN 1 ELSE 0 END) + (CASE WHEN "institutionApplicationId" IS NOT NULL THEN 1 ELSE 0 END) <= 1)
);

CREATE UNIQUE INDEX "RegistrationPayment_referenceNumber_key" ON "RegistrationPayment"("referenceNumber");
CREATE UNIQUE INDEX "RegistrationPayment_intentToken_key" ON "RegistrationPayment"("intentToken");
CREATE INDEX "RegistrationPayment_status_method_idx" ON "RegistrationPayment"("status", "method");
CREATE INDEX "RegistrationPayment_registrationId_idx" ON "RegistrationPayment"("registrationId");
CREATE INDEX "RegistrationPayment_institutionApplicationId_idx" ON "RegistrationPayment"("institutionApplicationId");
CREATE INDEX "RegistrationPayment_submittedAt_idx" ON "RegistrationPayment"("submittedAt");
