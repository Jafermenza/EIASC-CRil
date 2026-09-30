ALTER TABLE "Registration"
  ADD COLUMN "fieldOfStudy" TEXT,
  ADD COLUMN "careerRole" TEXT;

ALTER TABLE "Member"
  ADD COLUMN "fieldOfStudy" TEXT,
  ADD COLUMN "careerRole" TEXT;
