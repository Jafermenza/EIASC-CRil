CREATE TYPE "CredentialType" AS ENUM ('MEMBER', 'INSTITUTION', 'LICENSE');
CREATE TYPE "CredentialStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
CREATE TYPE "MembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'ENDED');
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'PUSH', 'USSD');
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ');
CREATE TYPE "AllocationPolicyStatus" AS ENUM ('DRAFT', 'APPROVED', 'RETIRED');
CREATE TYPE "AllocationRunStatus" AS ENUM ('PREVIEW', 'UNDER_REVIEW', 'APPROVED', 'FINALIZED', 'CANCELLED');

ALTER TABLE "MemberInstitution" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "MemberInstitution" ALTER COLUMN "status" TYPE "MembershipStatus"
  USING (CASE WHEN "status"::text = 'INACTIVE' THEN 'ENDED'::"MembershipStatus" ELSE "status"::text::"MembershipStatus" END);
ALTER TABLE "MemberInstitution" ALTER COLUMN "status" SET DEFAULT 'PENDING';

CREATE TABLE "Credential" (
  "id" UUID NOT NULL,
  "credentialNumber" TEXT NOT NULL,
  "type" "CredentialType" NOT NULL,
  "status" "CredentialStatus" NOT NULL DEFAULT 'ACTIVE',
  "tokenHash" TEXT NOT NULL,
  "memberId" UUID,
  "institutionId" UUID,
  "licenseId" UUID,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Credential_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Credential_credentialNumber_key" UNIQUE ("credentialNumber"),
  CONSTRAINT "Credential_tokenHash_key" UNIQUE ("tokenHash"),
  CONSTRAINT "Credential_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Credential_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Credential_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Credential_type_status_idx" ON "Credential"("type", "status");
CREATE INDEX "Credential_memberId_idx" ON "Credential"("memberId");
CREATE INDEX "Credential_institutionId_idx" ON "Credential"("institutionId");
CREATE INDEX "Credential_licenseId_idx" ON "Credential"("licenseId");

CREATE TABLE "Notification" (
  "id" UUID NOT NULL,
  "recipientId" UUID NOT NULL,
  "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
  "sentAt" TIMESTAMP(3),
  "readAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Notification_recipientId_status_createdAt_idx" ON "Notification"("recipientId", "status", "createdAt");

CREATE TABLE "AllocationPolicy" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "status" "AllocationPolicyStatus" NOT NULL DEFAULT 'DRAFT',
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "eligibilityRules" JSONB NOT NULL,
  "formulaDefinition" JSONB NOT NULL,
  "createdBy" UUID NOT NULL,
  "approvedBy" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AllocationPolicy_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AllocationPolicy_name_version_key" UNIQUE ("name", "version"),
  CONSTRAINT "AllocationPolicy_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AllocationPolicy_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "AllocationPolicy_status_effectiveFrom_idx" ON "AllocationPolicy"("status", "effectiveFrom");

CREATE TABLE "AllocationRun" (
  "id" UUID NOT NULL,
  "policyId" UUID NOT NULL,
  "policyVersion" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "fundingPool" DECIMAL(18,2) NOT NULL,
  "eligibleMemberCount" INTEGER NOT NULL,
  "basePerMemberAmount" DECIMAL(18,2) NOT NULL,
  "equalizationPool" DECIMAL(18,2) NOT NULL,
  "totalAllocated" DECIMAL(18,2) NOT NULL,
  "status" "AllocationRunStatus" NOT NULL DEFAULT 'PREVIEW',
  "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  "calculatedBy" UUID NOT NULL,
  "approvedBy" UUID,
  CONSTRAINT "AllocationRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AllocationRun_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "AllocationPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AllocationRun_calculatedBy_fkey" FOREIGN KEY ("calculatedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AllocationRun_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AllocationRun_policyId_period_calculatedAt_key" ON "AllocationRun"("policyId", "period", "calculatedAt");
CREATE INDEX "AllocationRun_status_period_idx" ON "AllocationRun"("status", "period");

CREATE TABLE "ResourceAllocation" (
  "id" UUID NOT NULL,
  "allocationRunId" UUID NOT NULL,
  "institutionId" UUID NOT NULL,
  "eligibleMemberCount" INTEGER NOT NULL,
  "baseAmount" DECIMAL(18,2) NOT NULL,
  "equalizationAmount" DECIMAL(18,2) NOT NULL,
  "totalAmount" DECIMAL(18,2) NOT NULL,
  CONSTRAINT "ResourceAllocation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ResourceAllocation_allocationRunId_fkey" FOREIGN KEY ("allocationRunId") REFERENCES "AllocationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ResourceAllocation_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ResourceAllocation_allocationRunId_institutionId_key" ON "ResourceAllocation"("allocationRunId", "institutionId");
CREATE INDEX "ResourceAllocation_institutionId_idx" ON "ResourceAllocation"("institutionId");
