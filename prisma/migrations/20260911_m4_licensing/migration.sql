CREATE TYPE "LicenseStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'REVOKED');

CREATE TYPE "LicenseApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CORRECTION_REQUIRED', 'RESUBMITTED', 'APPROVED', 'REJECTED');

CREATE TABLE "License" (
    "id" UUID NOT NULL,
    "licenseNumber" TEXT,
    "institutionId" UUID NOT NULL,
    "licenseType" TEXT NOT NULL,
    "status" "LicenseStatus" NOT NULL DEFAULT 'PENDING',
    "applicationStatus" "LicenseApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedAt" TIMESTAMP(3),
    "effectiveFrom" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "reason" TEXT,
    "issuedBy" UUID,
    "approvedBy" UUID,
    "createdBy" UUID,
    "reviewedBy" UUID,
    "approvedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "License_licenseNumber_key" ON "License"("licenseNumber");
CREATE INDEX "License_institutionId_idx" ON "License"("institutionId");
CREATE INDEX "License_status_idx" ON "License"("status");
CREATE INDEX "License_expiresAt_idx" ON "License"("expiresAt");
CREATE INDEX "License_applicationStatus_idx" ON "License"("applicationStatus");

ALTER TABLE "License" ADD CONSTRAINT "License_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
