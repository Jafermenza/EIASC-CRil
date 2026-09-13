-- Deterministic foundational schema reconstructed from the committed pre-M1 baseline schema.
-- The application prisma/schema.prisma remains the active development schema.
-- Later migrations remain unchanged.
-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DISABLED');

-- CreateEnum
CREATE TYPE "RoleCode" AS ENUM ('SUPER_ADMIN', 'NATIONAL_ADMIN', 'REGIONAL_ADMIN', 'ZONE_ADMIN', 'DISTRICT_ADMIN', 'REGISTRAR', 'INSPECTOR', 'FINANCE_OFFICER', 'INSTITUTION_ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "InstitutionStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'CLOSED');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "RegistrationType" AS ENUM ('INDIVIDUAL', 'INSTITUTION');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CORRECTION', 'RESUBMITTED', 'APPROVED', 'REJECTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "InstitutionApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CORRECTION_REQUIRED', 'RESUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InstitutionRelationshipType" AS ENUM ('PRIMARY', 'SECONDARY', 'OTHER');

-- CreateEnum
CREATE TYPE "InstitutionRelationshipStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" UUID NOT NULL,
    "code" "RoleCode" NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Region" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZoneCity" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "regionId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZoneCity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubcityTown" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zoneId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubcityTown_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "District" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subcityId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionType" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstitutionType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institution" (
    "id" UUID NOT NULL,
    "institutionCode" TEXT,
    "name" TEXT NOT NULL,
    "alternativeName" TEXT,
    "institutionTypeId" UUID NOT NULL,
    "establishmentDate" TIMESTAMP(3),
    "phone" TEXT,
    "secondaryPhone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "address" TEXT,
    "mission" TEXT,
    "description" TEXT,
    "services" TEXT,
    "communityActivities" TEXT,
    "regionId" UUID NOT NULL,
    "zoneId" UUID NOT NULL,
    "subcityId" UUID NOT NULL,
    "districtId" UUID NOT NULL,
    "status" "InstitutionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionApplication" (
    "id" UUID NOT NULL,
    "trackingCode" TEXT NOT NULL,
    "status" "InstitutionApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "institutionName" TEXT NOT NULL,
    "alternativeName" TEXT,
    "institutionTypeId" UUID NOT NULL,
    "establishmentDate" TIMESTAMP(3) NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "secondaryPhone" TEXT,
    "website" TEXT,
    "regionId" UUID NOT NULL,
    "zoneId" UUID NOT NULL,
    "subcityId" UUID NOT NULL,
    "districtId" UUID NOT NULL,
    "address" TEXT NOT NULL,
    "mission" TEXT,
    "description" TEXT,
    "services" TEXT,
    "communityActivities" TEXT,
    "applicantName" TEXT,
    "applicantPhone" TEXT,
    "applicantEmail" TEXT,
    "correctionReason" TEXT,
    "rejectionReason" TEXT,
    "institutionId" UUID,
    "submittedAt" TIMESTAMP(3),
    "decisionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstitutionApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionApplicationLeader" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,

    CONSTRAINT "InstitutionApplicationLeader_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionLeader" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstitutionLeader_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionApplicationStaffSummary" (
    "id" TEXT NOT NULL,
    "applicationId" UUID NOT NULL,
    "imamCount" INTEGER NOT NULL DEFAULT 0,
    "teacherCount" INTEGER NOT NULL DEFAULT 0,
    "administrativeStaffCount" INTEGER NOT NULL DEFAULT 0,
    "otherStaffCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InstitutionApplicationStaffSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionStaffSummary" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "imamCount" INTEGER NOT NULL DEFAULT 0,
    "teacherCount" INTEGER NOT NULL DEFAULT 0,
    "administrativeStaffCount" INTEGER NOT NULL DEFAULT 0,
    "otherStaffCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InstitutionStaffSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionApplicationEducation" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "studentCount" INTEGER NOT NULL DEFAULT 0,
    "teacherCount" INTEGER NOT NULL DEFAULT 0,
    "educationLevels" TEXT[],

    CONSTRAINT "InstitutionApplicationEducation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionEducation" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "studentCount" INTEGER NOT NULL DEFAULT 0,
    "teacherCount" INTEGER NOT NULL DEFAULT 0,
    "educationLevels" TEXT[],

    CONSTRAINT "InstitutionEducation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionDocument" (
    "id" UUID NOT NULL,
    "institutionApplicationId" UUID,
    "institutionId" UUID,
    "documentType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstitutionDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionStatusHistory" (
    "id" UUID NOT NULL,
    "institutionId" UUID,
    "applicationId" UUID,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "reason" TEXT,
    "actorUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstitutionStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" UUID NOT NULL,
    "membershipNumber" TEXT,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "gender" TEXT NOT NULL,
    "maritalStatus" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "educationLevel" TEXT,
    "employmentStatus" TEXT,
    "nationalIdentity" TEXT,
    "currentAddress" TEXT,
    "regionId" UUID NOT NULL,
    "zoneId" UUID NOT NULL,
    "subcityId" UUID NOT NULL,
    "districtId" UUID NOT NULL,
    "status" "MemberStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberInstitution" (
    "id" UUID NOT NULL,
    "memberId" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "relationshipType" "InstitutionRelationshipType" NOT NULL DEFAULT 'PRIMARY',
    "status" "InstitutionRelationshipStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberInstitution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Registration" (
    "id" UUID NOT NULL,
    "trackingCode" TEXT NOT NULL,
    "type" "RegistrationType" NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'DRAFT',
    "declarationAccepted" BOOLEAN NOT NULL,
    "firstName" TEXT,
    "middleName" TEXT,
    "lastName" TEXT,
    "birthDate" TIMESTAMP(3),
    "gender" TEXT,
    "maritalStatus" TEXT,
    "phone" TEXT,
    "educationLevel" TEXT,
    "employmentStatus" TEXT,
    "regionId" UUID,
    "zoneId" UUID,
    "subcityId" UUID,
    "districtId" UUID,
    "currentAddress" TEXT,
    "nationalIdentity" TEXT,
    "institutionId" UUID,
    "familyRelationship" TEXT,
    "familyMemberName" TEXT,
    "familyMemberPhone" TEXT,
    "correctionReason" TEXT,
    "rejectionReason" TEXT,
    "decisionAt" TIMESTAMP(3),
    "memberId" UUID,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Registration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorUserId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "requestId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "UserRole"("userId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "Region_code_key" ON "Region"("code");

-- CreateIndex
CREATE INDEX "Region_name_idx" ON "Region"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ZoneCity_code_key" ON "ZoneCity"("code");

-- CreateIndex
CREATE INDEX "ZoneCity_regionId_idx" ON "ZoneCity"("regionId");

-- CreateIndex
CREATE UNIQUE INDEX "SubcityTown_code_key" ON "SubcityTown"("code");

-- CreateIndex
CREATE INDEX "SubcityTown_zoneId_idx" ON "SubcityTown"("zoneId");

-- CreateIndex
CREATE UNIQUE INDEX "District_code_key" ON "District"("code");

-- CreateIndex
CREATE INDEX "District_subcityId_idx" ON "District"("subcityId");

-- CreateIndex
CREATE UNIQUE INDEX "InstitutionType_code_key" ON "InstitutionType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "InstitutionType_name_key" ON "InstitutionType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Institution_institutionCode_key" ON "Institution"("institutionCode");

-- CreateIndex
CREATE INDEX "Institution_regionId_zoneId_subcityId_districtId_idx" ON "Institution"("regionId", "zoneId", "subcityId", "districtId");

-- CreateIndex
CREATE INDEX "Institution_status_idx" ON "Institution"("status");

-- CreateIndex
CREATE INDEX "Institution_name_idx" ON "Institution"("name");

-- CreateIndex
CREATE UNIQUE INDEX "InstitutionApplication_trackingCode_key" ON "InstitutionApplication"("trackingCode");

-- CreateIndex
CREATE INDEX "InstitutionApplication_status_idx" ON "InstitutionApplication"("status");

-- CreateIndex
CREATE INDEX "InstitutionApplication_regionId_zoneId_subcityId_districtId_idx" ON "InstitutionApplication"("regionId", "zoneId", "subcityId", "districtId");

-- CreateIndex
CREATE INDEX "InstitutionApplication_institutionName_idx" ON "InstitutionApplication"("institutionName");

-- CreateIndex
CREATE INDEX "InstitutionApplicationLeader_applicationId_idx" ON "InstitutionApplicationLeader"("applicationId");

-- CreateIndex
CREATE INDEX "InstitutionLeader_institutionId_idx" ON "InstitutionLeader"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "InstitutionApplicationStaffSummary_applicationId_key" ON "InstitutionApplicationStaffSummary"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "InstitutionStaffSummary_institutionId_key" ON "InstitutionStaffSummary"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "InstitutionApplicationEducation_applicationId_key" ON "InstitutionApplicationEducation"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "InstitutionEducation_institutionId_key" ON "InstitutionEducation"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "InstitutionDocument_storageKey_key" ON "InstitutionDocument"("storageKey");

-- CreateIndex
CREATE INDEX "InstitutionDocument_institutionApplicationId_idx" ON "InstitutionDocument"("institutionApplicationId");

-- CreateIndex
CREATE INDEX "InstitutionDocument_institutionId_idx" ON "InstitutionDocument"("institutionId");

-- CreateIndex
CREATE INDEX "InstitutionStatusHistory_institutionId_createdAt_idx" ON "InstitutionStatusHistory"("institutionId", "createdAt");

-- CreateIndex
CREATE INDEX "InstitutionStatusHistory_applicationId_createdAt_idx" ON "InstitutionStatusHistory"("applicationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Member_membershipNumber_key" ON "Member"("membershipNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Member_nationalIdentity_key" ON "Member"("nationalIdentity");

-- CreateIndex
CREATE INDEX "Member_phone_idx" ON "Member"("phone");

-- CreateIndex
CREATE INDEX "Member_regionId_zoneId_subcityId_districtId_idx" ON "Member"("regionId", "zoneId", "subcityId", "districtId");

-- CreateIndex
CREATE INDEX "MemberInstitution_institutionId_status_idx" ON "MemberInstitution"("institutionId", "status");

-- CreateIndex
CREATE INDEX "MemberInstitution_memberId_status_idx" ON "MemberInstitution"("memberId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MemberInstitution_memberId_institutionId_key" ON "MemberInstitution"("memberId", "institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_trackingCode_key" ON "Registration"("trackingCode");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_memberId_key" ON "Registration"("memberId");

-- CreateIndex
CREATE INDEX "Registration_status_idx" ON "Registration"("status");

-- CreateIndex
CREATE INDEX "Registration_type_idx" ON "Registration"("type");

-- CreateIndex
CREATE INDEX "Registration_phone_idx" ON "Registration"("phone");

-- CreateIndex
CREATE INDEX "Registration_nationalIdentity_idx" ON "Registration"("nationalIdentity");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoneCity" ADD CONSTRAINT "ZoneCity_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubcityTown" ADD CONSTRAINT "SubcityTown_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "ZoneCity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "District" ADD CONSTRAINT "District_subcityId_fkey" FOREIGN KEY ("subcityId") REFERENCES "SubcityTown"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Institution" ADD CONSTRAINT "Institution_institutionTypeId_fkey" FOREIGN KEY ("institutionTypeId") REFERENCES "InstitutionType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Institution" ADD CONSTRAINT "Institution_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Institution" ADD CONSTRAINT "Institution_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "ZoneCity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Institution" ADD CONSTRAINT "Institution_subcityId_fkey" FOREIGN KEY ("subcityId") REFERENCES "SubcityTown"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Institution" ADD CONSTRAINT "Institution_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionApplication" ADD CONSTRAINT "InstitutionApplication_institutionTypeId_fkey" FOREIGN KEY ("institutionTypeId") REFERENCES "InstitutionType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionApplication" ADD CONSTRAINT "InstitutionApplication_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionApplication" ADD CONSTRAINT "InstitutionApplication_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "ZoneCity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionApplication" ADD CONSTRAINT "InstitutionApplication_subcityId_fkey" FOREIGN KEY ("subcityId") REFERENCES "SubcityTown"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionApplication" ADD CONSTRAINT "InstitutionApplication_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionApplication" ADD CONSTRAINT "InstitutionApplication_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionApplicationLeader" ADD CONSTRAINT "InstitutionApplicationLeader_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "InstitutionApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionLeader" ADD CONSTRAINT "InstitutionLeader_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionApplicationStaffSummary" ADD CONSTRAINT "InstitutionApplicationStaffSummary_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "InstitutionApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionStaffSummary" ADD CONSTRAINT "InstitutionStaffSummary_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionApplicationEducation" ADD CONSTRAINT "InstitutionApplicationEducation_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "InstitutionApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionEducation" ADD CONSTRAINT "InstitutionEducation_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionDocument" ADD CONSTRAINT "InstitutionDocument_institutionApplicationId_fkey" FOREIGN KEY ("institutionApplicationId") REFERENCES "InstitutionApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionDocument" ADD CONSTRAINT "InstitutionDocument_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionStatusHistory" ADD CONSTRAINT "InstitutionStatusHistory_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionStatusHistory" ADD CONSTRAINT "InstitutionStatusHistory_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "InstitutionApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "ZoneCity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_subcityId_fkey" FOREIGN KEY ("subcityId") REFERENCES "SubcityTown"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberInstitution" ADD CONSTRAINT "MemberInstitution_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberInstitution" ADD CONSTRAINT "MemberInstitution_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

