DO $$ BEGIN
  CREATE TYPE "LicensePaymentStatus" AS ENUM ('INITIATED','PENDING','PAID','REJECTED','FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TABLE IF EXISTS "LicensePayment";
CREATE TABLE "LicensePayment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "licenseId" UUID NOT NULL,
  "method" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ETB',
  "referenceNumber" TEXT NOT NULL,
  "providerReference" TEXT,
  "status" "LicensePaymentStatus" NOT NULL DEFAULT 'PENDING',
  "receiptUrl" TEXT,
  "submittedAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3),
  "verifiedBy" UUID,
  "rejectionReason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LicensePayment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LicensePayment_referenceNumber_key" UNIQUE ("referenceNumber"),
  CONSTRAINT "LicensePayment_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LicensePayment_licenseId_status_createdAt_idx" ON "LicensePayment" ("licenseId","status","createdAt");
CREATE INDEX "LicensePayment_status_createdAt_idx" ON "LicensePayment" ("status","createdAt");

CREATE TABLE IF NOT EXISTS "LicenseDocumentRequirement" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "licenseType" TEXT NOT NULL,
  "institutionTypeId" UUID,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT TRUE,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdByUserId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LicenseDocumentRequirement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LicenseDocumentRequirement_institutionTypeId_fkey" FOREIGN KEY ("institutionTypeId") REFERENCES "InstitutionType"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "LicenseDocumentRequirement_type_active_idx" ON "LicenseDocumentRequirement" ("licenseType","institutionTypeId","active");
CREATE INDEX IF NOT EXISTS "LicenseDocumentRequirement_code_active_idx" ON "LicenseDocumentRequirement" ("code","active");
