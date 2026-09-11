-- Support authoritative Ethiopian datasets that publish Region -> Zone/City -> Woreda.
-- Existing SubcityTown relationships are preserved; new source districts may attach directly to ZoneCity.

ALTER TABLE "Institution" ALTER COLUMN "subcityId" DROP NOT NULL;
ALTER TABLE "InstitutionApplication" ALTER COLUMN "subcityId" DROP NOT NULL;
ALTER TABLE "Member" ALTER COLUMN "subcityId" DROP NOT NULL;

ALTER TABLE "District" ADD COLUMN "zoneId" UUID;

UPDATE "District" AS d
SET "zoneId" = s."zoneId"
FROM "SubcityTown" AS s
WHERE d."subcityId" = s."id"
  AND d."zoneId" IS NULL;

CREATE INDEX "District_zoneId_idx" ON "District"("zoneId");

ALTER TABLE "District"
  ADD CONSTRAINT "District_zoneId_fkey"
  FOREIGN KEY ("zoneId") REFERENCES "ZoneCity"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
