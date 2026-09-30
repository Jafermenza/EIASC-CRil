CREATE TABLE IF NOT EXISTS "PlatformSetting" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "key" TEXT NOT NULL,
  "value" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlatformSetting_key_key" ON "PlatformSetting"("key");

CREATE TABLE IF NOT EXISTS "RegistrationBank" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "bankName" TEXT NOT NULL,
  "accountName" TEXT NOT NULL,
  "accountNumber" TEXT NOT NULL,
  "branch" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RegistrationBank_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RegistrationBank_active_displayOrder_idx" ON "RegistrationBank"("active", "displayOrder");
