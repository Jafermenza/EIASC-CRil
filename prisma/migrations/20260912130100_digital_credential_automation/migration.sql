CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION eiasc_member_credential_automation()
RETURNS TRIGGER AS $$
DECLARE
  credential_id UUID;
  credential_number TEXT;
  token_hash TEXT;
  years INTEGER;
BEGIN
  IF NEW.status = 'ACTIVE' THEN
    IF NEW."membershipNumber" IS NULL THEN
      LOOP
        credential_number := 'EIASC-M-' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || '-' || upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 8));
        EXIT WHEN NOT EXISTS (SELECT 1 FROM "Member" WHERE "membershipNumber" = credential_number);
      END LOOP;
      NEW."membershipNumber" := credential_number;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS eiasc_member_membership_number_before ON "Member";
CREATE TRIGGER eiasc_member_membership_number_before
BEFORE INSERT OR UPDATE OF "status" ON "Member"
FOR EACH ROW
EXECUTE FUNCTION eiasc_member_credential_automation();

CREATE OR REPLACE FUNCTION eiasc_member_credential_after()
RETURNS TRIGGER AS $$
DECLARE
  credential_id UUID;
  credential_number TEXT;
  token_hash TEXT;
  years INTEGER;
BEGIN
  IF NEW.status = 'ACTIVE' THEN
    SELECT id INTO credential_id FROM "Credential" WHERE "memberId" = NEW.id AND "type" = 'MEMBER' AND status = 'ACTIVE' LIMIT 1;
    IF credential_id IS NULL THEN
      LOOP
        credential_number := COALESCE(NEW."membershipNumber", 'EIASC-M-' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || '-' || upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 8)));
        EXIT WHEN NOT EXISTS (SELECT 1 FROM "Credential" WHERE "credentialNumber" = credential_number);
      END LOOP;
      token_hash := encode(digest(encode(gen_random_bytes(32), 'base64url'), 'sha256'), 'hex');
      INSERT INTO "Credential" (id, "credentialNumber", type, status, "tokenHash", "memberId", "issuedAt", "expiresAt", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), credential_number, 'MEMBER', 'ACTIVE', token_hash, NEW.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + make_interval(years => COALESCE((SELECT "validityYears" FROM "CredentialConfiguration" WHERE key='default'), 1)), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id INTO credential_id;
      INSERT INTO "CredentialPublication" ("credentialId", "publicationStatus", "validForYears", "issueDateHijri", "expiryDateHijri", "title", "locationLabel")
      SELECT credential_id, 'PUBLISHED', c."validityYears", NULL, NULL, c."memberCardTitle", c."locationLabel"
      FROM "CredentialConfiguration" c WHERE c.key='default';
      IF NOT EXISTS (SELECT 1 FROM "CredentialPublication" WHERE "credentialId"=credential_id) THEN
        INSERT INTO "CredentialPublication" ("credentialId", "publicationStatus", "title") VALUES (credential_id, 'PUBLISHED', 'Islamic Community Membership');
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS eiasc_member_credential_after ON "Member";
CREATE TRIGGER eiasc_member_credential_after
AFTER INSERT OR UPDATE OF "status", "membershipNumber" ON "Member"
FOR EACH ROW
EXECUTE FUNCTION eiasc_member_credential_after();

CREATE OR REPLACE FUNCTION eiasc_license_credential_after()
RETURNS TRIGGER AS $$
DECLARE
  credential_id UUID;
  credential_number TEXT;
  token_hash TEXT;
  years INTEGER;
  expiry TIMESTAMP(3);
BEGIN
  IF NEW."applicationStatus" = 'APPROVED' THEN
    SELECT id INTO credential_id FROM "Credential" WHERE "licenseId" = NEW.id AND type = 'LICENSE' LIMIT 1;
    IF credential_id IS NULL THEN
      years := COALESCE((SELECT "validityYears" FROM "CredentialConfiguration" WHERE key='default'), 1);
      expiry := COALESCE(NEW."expiresAt", CURRENT_TIMESTAMP + make_interval(years => years));
      LOOP
        credential_number := 'EIASC-L-' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || '-' || upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 8));
        EXIT WHEN NOT EXISTS (SELECT 1 FROM "Credential" WHERE "credentialNumber" = credential_number);
      END LOOP;
      token_hash := encode(digest(encode(gen_random_bytes(32), 'base64url'), 'sha256'), 'hex');
      INSERT INTO "Credential" (id, "credentialNumber", type, status, "tokenHash", "licenseId", "institutionId", "issuedAt", "expiresAt", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), credential_number, 'LICENSE', 'ACTIVE', token_hash, NEW.id, NEW."institutionId", CURRENT_TIMESTAMP, expiry, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id INTO credential_id;
      INSERT INTO "CredentialPublication" ("credentialId", "publicationStatus", "validForYears", "title", "locationLabel")
      SELECT credential_id, 'PENDING_REVIEW', years, c."certificateSubtitle", c."locationLabel" FROM "CredentialConfiguration" c WHERE c.key='default';
      IF NOT EXISTS (SELECT 1 FROM "CredentialPublication" WHERE "credentialId"=credential_id) THEN
        INSERT INTO "CredentialPublication" ("credentialId", "publicationStatus", "validForYears", "title") VALUES (credential_id, 'PENDING_REVIEW', years, 'OPERATIONAL CERTIFICATE');
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS eiasc_license_credential_after ON "License";
CREATE TRIGGER eiasc_license_credential_after
AFTER INSERT OR UPDATE OF "applicationStatus" ON "License"
FOR EACH ROW
EXECUTE FUNCTION eiasc_license_credential_after();

-- Backfill credentials for already-approved/active records without duplicating existing credentials.
UPDATE "Member" SET status = status WHERE status = 'ACTIVE';
UPDATE "License" SET "applicationStatus" = "applicationStatus" WHERE "applicationStatus" = 'APPROVED';
