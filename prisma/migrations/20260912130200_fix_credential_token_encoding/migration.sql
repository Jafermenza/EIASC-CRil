-- PostgreSQL encode() does not support the 'base64url' encoding name.
-- Keep credential token generation database-side, but hash the raw random bytes directly.
CREATE OR REPLACE FUNCTION eiasc_member_credential_after()
RETURNS TRIGGER AS $$
DECLARE
  credential_id UUID;
  credential_number TEXT;
  token_hash TEXT;
BEGIN
  IF NEW.status = 'ACTIVE' THEN
    SELECT id INTO credential_id
    FROM "Credential"
    WHERE "memberId" = NEW.id AND "type" = 'MEMBER' AND status = 'ACTIVE'
    LIMIT 1;

    IF credential_id IS NULL THEN
      LOOP
        credential_number := COALESCE(
          NEW."membershipNumber",
          'EIASC-M-' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || '-' || upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 8))
        );
        EXIT WHEN NOT EXISTS (
          SELECT 1 FROM "Credential" WHERE "credentialNumber" = credential_number
        );
      END LOOP;

      token_hash := encode(digest(gen_random_bytes(32), 'sha256'), 'hex');

      INSERT INTO "Credential" (
        id, "credentialNumber", type, status, "tokenHash", "memberId",
        "issuedAt", "expiresAt", "createdAt", "updatedAt"
      )
      VALUES (
        gen_random_uuid(), credential_number, 'MEMBER', 'ACTIVE', token_hash, NEW.id,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP + make_interval(years => COALESCE((
          SELECT "validityYears" FROM "CredentialConfiguration" WHERE key = 'default'
        ), 1)),
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING id INTO credential_id;

      INSERT INTO "CredentialPublication" (
        "credentialId", "publicationStatus", "validForYears", "issueDateHijri",
        "expiryDateHijri", "title", "locationLabel"
      )
      SELECT credential_id, 'PUBLISHED', c."validityYears", NULL, NULL,
             c."memberCardTitle", c."locationLabel"
      FROM "CredentialConfiguration" c
      WHERE c.key = 'default';

      IF NOT EXISTS (
        SELECT 1 FROM "CredentialPublication" WHERE "credentialId" = credential_id
      ) THEN
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
  credential_id UUID;
  credential_number TEXT;
  token_hash TEXT;
  years INTEGER;
  expiry TIMESTAMP(3);
BEGIN
  IF NEW."applicationStatus" = 'APPROVED' THEN
    SELECT id INTO credential_id
    FROM "Credential"
    WHERE "licenseId" = NEW.id AND type = 'LICENSE'
    LIMIT 1;

    IF credential_id IS NULL THEN
      years := COALESCE((
        SELECT "validityYears" FROM "CredentialConfiguration" WHERE key = 'default'
      ), 1);
      expiry := COALESCE(NEW."expiresAt", CURRENT_TIMESTAMP + make_interval(years => years));

      LOOP
        credential_number := 'EIASC-L-' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || '-' || upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 8));
        EXIT WHEN NOT EXISTS (
          SELECT 1 FROM "Credential" WHERE "credentialNumber" = credential_number
        );
      END LOOP;

      token_hash := encode(digest(gen_random_bytes(32), 'sha256'), 'hex');

      INSERT INTO "Credential" (
        id, "credentialNumber", type, status, "tokenHash", "licenseId", "institutionId",
        "issuedAt", "expiresAt", "createdAt", "updatedAt"
      )
      VALUES (
        gen_random_uuid(), credential_number, 'LICENSE', 'ACTIVE', token_hash, NEW.id, NEW."institutionId",
        CURRENT_TIMESTAMP, expiry, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING id INTO credential_id;

      INSERT INTO "CredentialPublication" (
        "credentialId", "publicationStatus", "validForYears", "title", "locationLabel"
      )
      SELECT credential_id, 'PENDING_REVIEW', years, c."certificateSubtitle", c."locationLabel"
      FROM "CredentialConfiguration" c
      WHERE c.key = 'default';

      IF NOT EXISTS (
        SELECT 1 FROM "CredentialPublication" WHERE "credentialId" = credential_id
      ) THEN
        INSERT INTO "CredentialPublication" (
          "credentialId", "publicationStatus", "validForYears", "title"
        )
        VALUES (credential_id, 'PENDING_REVIEW', years, 'OPERATIONAL CERTIFICATE');
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
