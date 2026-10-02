-- Add server-backed supporting documents for individual applications.
CREATE TABLE "RegistrationDocument" (
    "id" UUID NOT NULL,
    "registrationId" UUID NOT NULL,
    "memberId" UUID,
    "documentType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RegistrationDocument_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RegistrationDocument_storageKey_key" ON "RegistrationDocument"("storageKey");
CREATE INDEX "RegistrationDocument_registrationId_createdAt_idx" ON "RegistrationDocument"("registrationId", "createdAt");
CREATE INDEX "RegistrationDocument_memberId_createdAt_idx" ON "RegistrationDocument"("memberId", "createdAt");
ALTER TABLE "RegistrationDocument" ADD CONSTRAINT "RegistrationDocument_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RegistrationDocument" ADD CONSTRAINT "RegistrationDocument_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InstitutionDocument" ADD COLUMN "storageUrl" TEXT;
UPDATE "InstitutionDocument" SET "storageUrl" = "storageKey" WHERE "storageUrl" IS NULL;
ALTER TABLE "InstitutionDocument" ALTER COLUMN "storageUrl" SET NOT NULL;
