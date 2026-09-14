-- Members must supply a unique phone number and email; Registration retains the submitted email.
ALTER TABLE "Registration" ADD COLUMN IF NOT EXISTS "email" TEXT;
CREATE INDEX IF NOT EXISTS "Registration_email_idx" ON "Registration"("email");

ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "email" TEXT;

DO $$ BEGIN
  ALTER TABLE "Member" ADD CONSTRAINT "Member_phone_key" UNIQUE ("phone");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Member" ADD CONSTRAINT "Member_email_key" UNIQUE ("email");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
