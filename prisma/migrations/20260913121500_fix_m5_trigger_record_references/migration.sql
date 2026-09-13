-- M5 CI fix: PostgreSQL trigger records are copied to local variables before
-- being referenced inside SQL statements. This avoids treating NEW as a SQL
-- table alias on shared/CI PostgreSQL versions while preserving automation.

CREATE OR REPLACE FUNCTION eiasc_member_credential_after()
RETURNS TRIGGER AS $$
DECLARE
  member_id_value UUID := NEW."id";
  membership_number_value TEXT := NEW."membershipNumber";
  credential_id UUID;
  credential_number TEXT;
  token_hash TEXT;
BEGIN
  IF NEW."status" = 'ACTIVE' THEN
    SELECT "id" INTO credential_id
    FROM "Credential"
    WHERE "memberId" = member_id_value AND "type" = 'MEMBER' AND "status" = 'ACTIVE'
    LIMIT 1;

    IF credential_id IS NULL THEN
      LOOP
        credential_number := COALESCE(
          membership_number_value,
          'EIASC-M-' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || '-' || upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 8))
        );
        EXIT WHEN NOT EXISTS (SELECT 1 FROM "Credential" WHERE "credentialNumber" = credential_number);
        membership_number_value := NULL;
      END LOOP;

      token_hash := encode(digest(encode(gen_random_bytes(32), 'base64url'), 'sha256'), 'hex');
      INSERT INTO "Credential" ("id", "credentialNumber", "type", "status", "tokenHash", "memberId", "issuedAt", "expiresAt", "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid(),
        credential_number,
        'MEMBER',
        'ACTIVE',
        token_hash,
        member_id_value,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP + make_interval(years => COALESCE((SELECT "validityYears" FROM "CredentialConfiguration" WHERE "key"='default'), 1)),
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      RETURNING "id" INTO credential_id;

      INSERT INTO "CredentialPublication" ("credentialId", "publicationStatus", "validForYears", "issueDateHijri", "expiryDateHijri", "title", "locationLabel")
      SELECT credential_id, 'PUBLISHED', c."validityYears", NULL, NULL, c."memberCardTitle", c."locationLabel"
      FROM "CredentialConfiguration" c WHERE c."key"='default';

      IF NOT EXISTS (SELECT 1 FROM "CredentialPublication" WHERE "credentialId"=credential_id) THEN
        INSERT INTO "CredentialPublication" ("credentialId", "publicationStatus", "title")
        VALUES (credential_id, 'PUBLISHED', 'Islamic Community Membership');
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION eiasc_license_credential_after()
RETURNS TRIGGER AS $$
DECLARE
  license_id_value UUID := NEW."id";
  institution_id_value UUID := NEW."institutionId";
  license_expiry_value TIMESTAMP(3) := NEW."expiresAt";
  credential_id UUID;
  credential_number TEXT;
  token_hash TEXT;
  years INTEGER;
  expiry TIMESTAMP(3);
BEGIN
  IF NEW."applicationStatus" = 'APPROVED' THEN
    SELECT "id" INTO credential_id FROM "Credential" WHERE "licenseId" = license_id_value AND "type" = 'LICENSE' LIMIT 1;
    IF credential_id IS NULL THEN
      years := COALESCE((SELECT "validityYears" FROM "CredentialConfiguration" WHERE "key"='default'), 1);
      expiry := COALESCE(license_expiry_value, CURRENT_TIMESTAMP + make_interval(years => years));
      LOOP
        credential_number := 'EIASC-L-' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || '-' || upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 8));
        EXIT WHEN NOT EXISTS (SELECT 1 FROM "Credential" WHERE "credentialNumber" = credential_number);
      END LOOP;
      token_hash := encode(digest(encode(gen_random_bytes(32), 'base64url'), 'sha256'), 'hex');
      INSERT INTO "Credential" ("id", "credentialNumber", "type", "status", "tokenHash", "licenseId", "institutionId", "issuedAt", "expiresAt", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), credential_number, 'LICENSE', 'ACTIVE', token_hash, license_id_value, institution_id_value, CURRENT_TIMESTAMP, expiry, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING "id" INTO credential_id;
      INSERT INTO "CredentialPublication" ("credentialId", "publicationStatus", "validForYears", "title", "locationLabel")
      SELECT credential_id, 'PENDING_REVIEW', years, c."certificateSubtitle", c."locationLabel" FROM "CredentialConfiguration" c WHERE c."key"='default';
      IF NOT EXISTS (SELECT 1 FROM "CredentialPublication" WHERE "credentialId"=credential_id) THEN
        INSERT INTO "CredentialPublication" ("credentialId", "publicationStatus", "validForYears", "title") VALUES (credential_id, 'PENDING_REVIEW', years, 'OPERATIONAL CERTIFICATE');
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_credential_expiry_from_configuration()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  credential_member_id UUID := NEW."memberId";
  credential_institution_id UUID := NEW."institutionId";
  credential_license_id UUID := NEW."licenseId";
  subject_region_id UUID;
  configured_years INTEGER;
BEGIN
  IF NEW."expiresAt" IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF credential_member_id IS NOT NULL THEN
    SELECT "regionId" INTO subject_region_id FROM "Member" WHERE "id" = credential_member_id;
  ELSIF credential_institution_id IS NOT NULL THEN
    SELECT "regionId" INTO subject_region_id FROM "Institution" WHERE "id" = credential_institution_id;
  ELSIF credential_license_id IS NOT NULL THEN
    SELECT i."regionId" INTO subject_region_id
    FROM "License" l JOIN "Institution" i ON i."id" = l."institutionId"
    WHERE l."id" = credential_license_id;
  END IF;

  IF subject_region_id IS NOT NULL THEN
    SELECT "validityYears" INTO configured_years
    FROM "CredentialConfiguration"
    WHERE "key" = 'region:' || subject_region_id::text
    LIMIT 1;
  END IF;

  IF configured_years IS NULL THEN
    SELECT "validityYears" INTO configured_years
    FROM "CredentialConfiguration"
    WHERE "key" = 'default'
    LIMIT 1;
  END IF;

  IF configured_years IS NOT NULL AND configured_years > 0 THEN
    NEW."expiresAt" := COALESCE(NEW."issuedAt", CURRENT_TIMESTAMP) + make_interval(years => configured_years);
  END IF;

  RETURN NEW;
END;
$$;
