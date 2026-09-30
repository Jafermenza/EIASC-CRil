CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "CredentialConfiguration" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "key" TEXT NOT NULL DEFAULT 'default',
  "certificateTitle" TEXT NOT NULL DEFAULT 'ETHIOPIAN ISLAMIC AFFAIRS SUPREME COUNCIL',
  "certificateSubtitle" TEXT NOT NULL DEFAULT 'OPERATIONAL CERTIFICATE',
  "memberCardTitle" TEXT NOT NULL DEFAULT 'Islamic Community Membership',
  "issuingAuthority" TEXT NOT NULL DEFAULT 'Ethiopian Islamic Affairs Supreme Council',
  "validityYears" INTEGER NOT NULL DEFAULT 1,
  "authorizedSigner" TEXT,
  "authorizedTitle" TEXT,
  "signatureImageUrl" TEXT,
  "sealImageUrl" TEXT,
  "institutionLabel" TEXT NOT NULL DEFAULT 'Institution',
  "locationLabel" TEXT NOT NULL DEFAULT 'Location',
  "membershipLabel" TEXT NOT NULL DEFAULT 'Membership Number',
  "certificateNumberLabel" TEXT NOT NULL DEFAULT 'Certificate Number',
  "issueDateLabel" TEXT NOT NULL DEFAULT 'Issue Date',
  "expiryDateLabel" TEXT NOT NULL DEFAULT 'Expiry Date',
  "validForLabel" TEXT NOT NULL DEFAULT 'Valid for',
  "updatedBy" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CredentialConfiguration_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CredentialConfiguration_key_key" ON "CredentialConfiguration"("key");

CREATE TABLE IF NOT EXISTS "CredentialPublication" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "credentialId" UUID NOT NULL,
  "publicationStatus" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  "reviewedBy" UUID,
  "reviewedAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "validForYears" INTEGER,
  "issueDateHijri" TEXT,
  "expiryDateHijri" TEXT,
  "authorizedSigner" TEXT,
  "authorizedTitle" TEXT,
  "signatureImageUrl" TEXT,
  "sealImageUrl" TEXT,
  "title" TEXT,
  "locationLabel" TEXT,
  "designVersion" TEXT DEFAULT 'M5-ISLAMIC-1',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CredentialPublication_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CredentialPublication_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "CredentialPublication_credentialId_key" ON "CredentialPublication"("credentialId");
CREATE INDEX IF NOT EXISTS "CredentialPublication_publicationStatus_idx" ON "CredentialPublication"("publicationStatus");

INSERT INTO "CredentialConfiguration" ("key") VALUES ('default') ON CONFLICT ("key") DO NOTHING;
