-- Phase 6: membership integrity
DROP INDEX IF EXISTS "MemberInstitution_memberId_institutionId_key";
CREATE INDEX IF NOT EXISTS "MemberInstitution_memberId_institutionId_idx" ON "MemberInstitution" ("memberId", "institutionId");

CREATE TABLE "MemberInstitutionHistory" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "memberInstitutionId" UUID NOT NULL,
  "memberId" UUID NOT NULL,
  "institutionId" UUID NOT NULL,
  "fromStatus" "MembershipStatus",
  "toStatus" "MembershipStatus" NOT NULL,
  "relationshipType" "InstitutionRelationshipType" NOT NULL,
  "effectiveFrom" TIMESTAMP(3),
  "effectiveTo" TIMESTAMP(3),
  "reason" TEXT,
  "actorUserId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MemberInstitutionHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MemberInstitutionHistory_memberInstitutionId_createdAt_idx"
  ON "MemberInstitutionHistory" ("memberInstitutionId", "createdAt");
CREATE INDEX "MemberInstitutionHistory_memberId_createdAt_idx"
  ON "MemberInstitutionHistory" ("memberId", "createdAt");
CREATE INDEX "MemberInstitutionHistory_institutionId_createdAt_idx"
  ON "MemberInstitutionHistory" ("institutionId", "createdAt");

ALTER TABLE "MemberInstitutionHistory"
  ADD CONSTRAINT "MemberInstitutionHistory_memberInstitutionId_fkey"
  FOREIGN KEY ("memberInstitutionId") REFERENCES "MemberInstitution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberInstitutionHistory"
  ADD CONSTRAINT "MemberInstitutionHistory_memberId_fkey"
  FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberInstitutionHistory"
  ADD CONSTRAINT "MemberInstitutionHistory_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberInstitutionHistory"
  ADD CONSTRAINT "MemberInstitutionHistory_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "MemberInstitution_memberId_relationshipType_status_idx"
  ON "MemberInstitution" ("memberId", "relationshipType", "status");

-- A member may have multiple affiliations, but only one active PRIMARY affiliation.
CREATE UNIQUE INDEX "MemberInstitution_one_active_primary_per_member_key"
  ON "MemberInstitution" ("memberId")
  WHERE "status" = 'ACTIVE' AND "relationshipType" = 'PRIMARY';
