CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "PlatformSetting" (
  "key" TEXT PRIMARY KEY,
  "value" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "RegistrationBank" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "bankName" TEXT NOT NULL,
  "accountName" TEXT NOT NULL,
  "accountNumber" TEXT NOT NULL,
  "branch" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "RegistrationBank_active_displayOrder_idx" ON "RegistrationBank" ("active", "displayOrder");

INSERT INTO "PlatformSetting" ("key", "value") VALUES
  ('REGISTRATION_INDIVIDUAL_FEE_ETB', NULL),
  ('REGISTRATION_INSTITUTION_FEE_ETB', NULL)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RegistrationBank" ("bankName", "accountName", "accountNumber", "branch", "displayOrder")
SELECT v."bankName", v."accountName", v."accountNumber", v."branch", v."displayOrder"
FROM (VALUES
  (NULL::text, NULL::text, NULL::text, NULL::text, 0)
) AS v("bankName", "accountName", "accountNumber", "branch", "displayOrder")
WHERE FALSE;
