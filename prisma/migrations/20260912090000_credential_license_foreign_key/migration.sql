-- License is created by 20260911_m4_licensing, which sorts after the M5/M10 migration.
-- Add this dependency only after the License table exists.
ALTER TABLE "Credential"
  ADD CONSTRAINT "Credential_licenseId_fkey"
  FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE CASCADE ON UPDATE CASCADE;
