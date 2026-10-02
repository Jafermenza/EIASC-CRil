-- Application amendment history: preserve the submitted version before each applicant amendment/resubmission.
CREATE TABLE "RegistrationAmendment" (
  "id" UUID NOT NULL,
  "registrationId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "statusBefore" "RegistrationStatus" NOT NULL,
  "statusAfter" "RegistrationStatus" NOT NULL,
  "snapshot" JSONB NOT NULL,
  "changedFields" TEXT[] NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RegistrationAmendment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RegistrationAmendment_registrationId_version_key" ON "RegistrationAmendment"("registrationId","version");
CREATE INDEX "RegistrationAmendment_registrationId_submittedAt_idx" ON "RegistrationAmendment"("registrationId","submittedAt");
ALTER TABLE "RegistrationAmendment"
  ADD CONSTRAINT "RegistrationAmendment_registrationId_fkey"
  FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "InstitutionApplicationAmendment" (
  "id" UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "statusBefore" "InstitutionApplicationStatus" NOT NULL,
  "statusAfter" "InstitutionApplicationStatus" NOT NULL,
  "snapshot" JSONB NOT NULL,
  "changedFields" TEXT[] NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InstitutionApplicationAmendment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InstitutionApplicationAmendment_applicationId_version_key" ON "InstitutionApplicationAmendment"("applicationId","version");
CREATE INDEX "InstitutionApplicationAmendment_applicationId_submittedAt_idx" ON "InstitutionApplicationAmendment"("applicationId","submittedAt");
ALTER TABLE "InstitutionApplicationAmendment"
  ADD CONSTRAINT "InstitutionApplicationAmendment_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "InstitutionApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
