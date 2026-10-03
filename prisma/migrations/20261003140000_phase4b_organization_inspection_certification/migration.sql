-- Phase 4B: organization-type-aware inspection, inspector assignment, checklist snapshots and certificate subject type
CREATE TABLE "InspectionChecklistTemplate" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "institutionTypeId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "inspectionRequired" BOOLEAN NOT NULL DEFAULT true,
  "items" JSONB NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdByUserId" UUID,
  "updatedByUserId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InspectionChecklistTemplate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InspectionChecklistTemplate_institutionTypeId_fkey" FOREIGN KEY ("institutionTypeId") REFERENCES "InstitutionType"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "InspectionChecklistTemplate_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "InspectionChecklistTemplate_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "InspectionChecklistTemplate_institutionTypeId_version_key" ON "InspectionChecklistTemplate"("institutionTypeId","version");
CREATE INDEX "InspectionChecklistTemplate_institutionTypeId_active_idx" ON "InspectionChecklistTemplate"("institutionTypeId","active");

CREATE TABLE "InspectorAssignment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "inspectorUserId" UUID NOT NULL,
  "institutionTypeId" UUID,
  "jurisdictionLevel" "JurisdictionLevel" NOT NULL,
  "jurisdictionId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdByUserId" UUID,
  CONSTRAINT "InspectorAssignment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InspectorAssignment_inspectorUserId_fkey" FOREIGN KEY ("inspectorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "InspectorAssignment_institutionTypeId_fkey" FOREIGN KEY ("institutionTypeId") REFERENCES "InstitutionType"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "InspectorAssignment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "InspectorAssignment_inspectorUserId_active_idx" ON "InspectorAssignment"("inspectorUserId","active");
CREATE INDEX "InspectorAssignment_institutionTypeId_active_idx" ON "InspectorAssignment"("institutionTypeId","active");
CREATE INDEX "InspectorAssignment_jurisdictionLevel_jurisdictionId_active_idx" ON "InspectorAssignment"("jurisdictionLevel","jurisdictionId","active");

ALTER TABLE "Inspection" ADD COLUMN "institutionTypeId" UUID;
ALTER TABLE "Inspection" ADD COLUMN "inspectorAssignmentId" UUID;
ALTER TABLE "Inspection" ADD COLUMN "checklistTemplateId" UUID;
ALTER TABLE "Inspection" ADD COLUMN "institutionTypeCode" TEXT;
ALTER TABLE "Inspection" ADD COLUMN "institutionTypeName" TEXT;
ALTER TABLE "Inspection" ADD COLUMN "checklistSnapshot" JSONB;
ALTER TABLE "Inspection" ADD COLUMN "checklistResponses" JSONB;
ALTER TABLE "Inspection" ADD COLUMN "report" JSONB;

UPDATE "Inspection" i
SET "institutionTypeId" = a."institutionTypeId",
    "institutionTypeCode" = t."code",
    "institutionTypeName" = t."name"
FROM "InstitutionApplication" a
JOIN "InstitutionType" t ON t."id" = a."institutionTypeId"
WHERE i."institutionApplicationId" = a."id";

UPDATE "Inspection"
SET "checklistSnapshot" = '{"items":[]}'::jsonb
WHERE "checklistSnapshot" IS NULL;

ALTER TABLE "Inspection" ALTER COLUMN "institutionTypeId" SET NOT NULL;
ALTER TABLE "Inspection" ALTER COLUMN "checklistTemplateId" DROP NOT NULL;
ALTER TABLE "Inspection" ALTER COLUMN "institutionTypeCode" SET NOT NULL;
ALTER TABLE "Inspection" ALTER COLUMN "institutionTypeName" SET NOT NULL;
ALTER TABLE "Inspection" ALTER COLUMN "checklistSnapshot" SET NOT NULL;

ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_institutionTypeId_fkey" FOREIGN KEY ("institutionTypeId") REFERENCES "InstitutionType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_inspectorAssignmentId_fkey" FOREIGN KEY ("inspectorAssignmentId") REFERENCES "InspectorAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_checklistTemplateId_fkey" FOREIGN KEY ("checklistTemplateId") REFERENCES "InspectionChecklistTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Inspection_institutionTypeId_status_idx" ON "Inspection"("institutionTypeId","status");
CREATE INDEX "Inspection_checklistTemplateId_idx" ON "Inspection"("checklistTemplateId");

ALTER TABLE "Credential" ADD COLUMN "institutionTypeId" UUID;
UPDATE "Credential" c
SET "institutionTypeId" = i."institutionTypeId"
FROM "Institution" i
WHERE c."institutionId" = i."id" AND c."institutionTypeId" IS NULL;
UPDATE "Credential" c
SET "institutionTypeId" = i."institutionTypeId"
FROM "License" l JOIN "Institution" i ON i."id" = l."institutionId"
WHERE c."licenseId" = l."id" AND c."institutionTypeId" IS NULL;
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_institutionTypeId_fkey" FOREIGN KEY ("institutionTypeId") REFERENCES "InstitutionType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Credential_institutionTypeId_idx" ON "Credential"("institutionTypeId");

CREATE INDEX "InstitutionApplication_institutionTypeId_status_idx" ON "InstitutionApplication"("institutionTypeId","status");
