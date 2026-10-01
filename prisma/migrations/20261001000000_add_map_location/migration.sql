-- Add optional reference latitude/longitude to geography levels (admin-imported reference points)
ALTER TABLE "Region" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "Region" ADD COLUMN "longitude" DOUBLE PRECISION;

ALTER TABLE "ZoneCity" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "ZoneCity" ADD COLUMN "longitude" DOUBLE PRECISION;

ALTER TABLE "SubcityTown" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "SubcityTown" ADD COLUMN "longitude" DOUBLE PRECISION;

ALTER TABLE "District" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "District" ADD COLUMN "longitude" DOUBLE PRECISION;

-- Add map-location fields to institution registration/records
ALTER TABLE "InstitutionApplication" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "InstitutionApplication" ADD COLUMN "longitude" DOUBLE PRECISION;
ALTER TABLE "InstitutionApplication" ADD COLUMN "locationVerified" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Institution" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "Institution" ADD COLUMN "longitude" DOUBLE PRECISION;
ALTER TABLE "Institution" ADD COLUMN "locationVerified" BOOLEAN NOT NULL DEFAULT false;
