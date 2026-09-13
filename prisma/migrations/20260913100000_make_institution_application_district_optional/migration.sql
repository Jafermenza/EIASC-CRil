-- Institution registration may omit District/Woreda when the selected geography
-- does not configure that level. Preserve the selected zone as the authoritative
-- parent for the application.
ALTER TABLE "InstitutionApplication" ALTER COLUMN "districtId" DROP NOT NULL;
