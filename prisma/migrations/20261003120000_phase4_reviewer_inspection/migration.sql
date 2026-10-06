CREATE TYPE "InspectionStatus" AS ENUM ('ASSIGNED','IN_PROGRESS','COMPLETED','CANCELLED');
CREATE TYPE "InspectionDecision" AS ENUM ('PENDING','PASS','FAIL','CONDITIONAL');

ALTER TABLE "InstitutionApplication" ADD COLUMN "inspectionRequired" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "ApplicationReviewSnapshot" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "registrationId" UUID,
  "institutionApplicationId" UUID,
  "capturedByUserId" UUID NOT NULL,
  "status" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApplicationReviewSnapshot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApplicationReviewSnapshot_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ApplicationReviewSnapshot_institutionApplicationId_fkey" FOREIGN KEY ("institutionApplicationId") REFERENCES "InstitutionApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ApplicationReviewSnapshot_capturedByUserId_fkey" FOREIGN KEY ("capturedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ApplicationReviewSnapshot_registrationId_createdAt_idx" ON "ApplicationReviewSnapshot"("registrationId","createdAt");
CREATE INDEX "ApplicationReviewSnapshot_institutionApplicationId_createdAt_idx" ON "ApplicationReviewSnapshot"("institutionApplicationId","createdAt");

CREATE TABLE "ApplicationCorrection" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "registrationId" UUID,
  "institutionApplicationId" UUID,
  "requestedByUserId" UUID NOT NULL,
  "reason" TEXT NOT NULL,
  "fields" JSONB,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApplicationCorrection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApplicationCorrection_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ApplicationCorrection_institutionApplicationId_fkey" FOREIGN KEY ("institutionApplicationId") REFERENCES "InstitutionApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ApplicationCorrection_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ApplicationCorrection_registrationId_createdAt_idx" ON "ApplicationCorrection"("registrationId","createdAt");
CREATE INDEX "ApplicationCorrection_institutionApplicationId_createdAt_idx" ON "ApplicationCorrection"("institutionApplicationId","createdAt");

CREATE TABLE "Inspection" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "registrationId" UUID,
  "institutionApplicationId" UUID,
  "assignedToUserId" UUID NOT NULL,
  "status" "InspectionStatus" NOT NULL DEFAULT 'ASSIGNED',
  "decision" "InspectionDecision" NOT NULL DEFAULT 'PENDING',
  "scheduledAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "findings" JSONB,
  "decisionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Inspection_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Inspection_institutionApplicationId_fkey" FOREIGN KEY ("institutionApplicationId") REFERENCES "InstitutionApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Inspection_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "Inspection_registrationId_status_idx" ON "Inspection"("registrationId","status");
CREATE INDEX "Inspection_institutionApplicationId_status_idx" ON "Inspection"("institutionApplicationId","status");
CREATE INDEX "Inspection_assignedToUserId_status_idx" ON "Inspection"("assignedToUserId","status");
CREATE TABLE "RegistrationAmendment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "registrationId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "changedFields" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RegistrationAmendment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RegistrationAmendment_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "RegistrationAmendment_registrationId_version_key" ON "RegistrationAmendment"("registrationId","version");
CREATE INDEX "RegistrationAmendment_registrationId_createdAt_idx" ON "RegistrationAmendment"("registrationId","createdAt");

CREATE TABLE "InstitutionApplicationAmendment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "institutionApplicationId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "changedFields" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InstitutionApplicationAmendment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InstitutionApplicationAmendment_institutionApplicationId_fkey" FOREIGN KEY ("institutionApplicationId") REFERENCES "InstitutionApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "InstitutionApplicationAmendment_application_version_key" ON "InstitutionApplicationAmendment"("institutionApplicationId","version");
CREATE INDEX "InstitutionApplicationAmendment_application_createdAt_idx" ON "InstitutionApplicationAmendment"("institutionApplicationId","createdAt");
