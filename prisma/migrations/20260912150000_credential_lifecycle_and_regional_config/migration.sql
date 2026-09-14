ALTER TABLE "CredentialConfiguration"
  ADD COLUMN IF NOT EXISTS "regionId" UUID;

CREATE INDEX IF NOT EXISTS "CredentialConfiguration_regionId_idx"
  ON "CredentialConfiguration"("regionId");

CREATE UNIQUE INDEX IF NOT EXISTS "CredentialConfiguration_regionId_key"
  ON "CredentialConfiguration"("regionId")
  WHERE "regionId" IS NOT NULL;

DO $$ BEGIN
  ALTER TABLE "CredentialConfiguration"
    ADD CONSTRAINT "CredentialConfiguration_regionId_fkey"
    FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Credential"
  ADD COLUMN IF NOT EXISTS "revocationReason" TEXT,
  ADD COLUMN IF NOT EXISTS "revokedBy" UUID;

CREATE TABLE IF NOT EXISTS "CredentialHistory" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "credentialId" UUID NOT NULL,
  "action" TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT,
  "reason" TEXT,
  "actorUserId" UUID,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CredentialHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CredentialHistory_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "CredentialHistory_credentialId_createdAt_idx" ON "CredentialHistory"("credentialId","createdAt");
CREATE INDEX IF NOT EXISTS "CredentialHistory_action_createdAt_idx" ON "CredentialHistory"("action","createdAt");
