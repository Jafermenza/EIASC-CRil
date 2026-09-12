-- GeographyImport is part of the current application schema but was missing from the
-- historical baseline and migration chain. Keep it as a forward migration rather
-- than polluting the foundational baseline with later application concerns.

CREATE TYPE "GeographyImportStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

CREATE TABLE "GeographyImport" (
    "id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "sourceVersion" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "status" "GeographyImportStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "importedByUserId" UUID,
    "regionCount" INTEGER NOT NULL DEFAULT 0,
    "zoneCount" INTEGER NOT NULL DEFAULT 0,
    "districtCount" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "deactivatedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,

    CONSTRAINT "GeographyImport_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "GeographyImport_importedByUserId_fkey"
      FOREIGN KEY ("importedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "GeographyImport_source_sourceVersion_idx"
  ON "GeographyImport"("source", "sourceVersion");
CREATE INDEX "GeographyImport_status_startedAt_idx"
  ON "GeographyImport"("status", "startedAt");
