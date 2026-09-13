CREATE OR REPLACE FUNCTION set_credential_expiry_from_configuration()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  subject_region_id UUID;
  configured_years INTEGER;
BEGIN
  IF NEW.expiresAt IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.memberId IS NOT NULL THEN
    SELECT "regionId" INTO subject_region_id
    FROM "Member"
    WHERE "id" = NEW.memberId;
  ELSIF NEW.institutionId IS NOT NULL THEN
    SELECT "regionId" INTO subject_region_id
    FROM "Institution"
    WHERE "id" = NEW.institutionId;
  ELSIF NEW.licenseId IS NOT NULL THEN
    SELECT i."regionId" INTO subject_region_id
    FROM "License" l
    JOIN "Institution" i ON i."id" = l."institutionId"
    WHERE l."id" = NEW.licenseId;
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
    NEW.expiresAt := COALESCE(NEW.issuedAt, CURRENT_TIMESTAMP) + make_interval(years => configured_years);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS credential_apply_configured_validity ON "Credential";

CREATE TRIGGER credential_apply_configured_validity
BEFORE INSERT ON "Credential"
FOR EACH ROW
EXECUTE FUNCTION set_credential_expiry_from_configuration();

UPDATE "Credential" c
SET "expiresAt" = COALESCE(c."issuedAt", CURRENT_TIMESTAMP) + make_interval(years => COALESCE(rc."validityYears", dc."validityYears", 1))
FROM "Member" m
LEFT JOIN "CredentialConfiguration" rc ON rc."key" = 'region:' || m."regionId"::text
LEFT JOIN "CredentialConfiguration" dc ON dc."key" = 'default'
WHERE c."memberId" = m."id"
  AND c."expiresAt" IS NULL;

UPDATE "Credential" c
SET "expiresAt" = COALESCE(c."issuedAt", CURRENT_TIMESTAMP) + make_interval(years => COALESCE(rc."validityYears", dc."validityYears", 1))
FROM "Institution" i
LEFT JOIN "CredentialConfiguration" rc ON rc."key" = 'region:' || i."regionId"::text
LEFT JOIN "CredentialConfiguration" dc ON dc."key" = 'default'
WHERE c."institutionId" = i."id"
  AND c."expiresAt" IS NULL;

UPDATE "Credential" c
SET "expiresAt" = COALESCE(c."issuedAt", CURRENT_TIMESTAMP) + make_interval(years => COALESCE(rc."validityYears", dc."validityYears", 1))
FROM "License" l
JOIN "Institution" i ON i."id" = l."institutionId"
LEFT JOIN "CredentialConfiguration" rc ON rc."key" = 'region:' || i."regionId"::text
LEFT JOIN "CredentialConfiguration" dc ON dc."key" = 'default'
WHERE c."licenseId" = l."id"
  AND c."expiresAt" IS NULL;
