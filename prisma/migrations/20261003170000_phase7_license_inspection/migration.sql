ALTER TABLE "Inspection" ADD COLUMN IF NOT EXISTS "licenseId" UUID;
CREATE INDEX IF NOT EXISTS "Inspection_licenseId_status_idx" ON "Inspection" ("licenseId","status");
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE CASCADE ON UPDATE CASCADE;
