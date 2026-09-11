import { InstitutionApplicationStatus, InstitutionRelationshipType, InstitutionRelationshipStatus, InstitutionStatus } from '@prisma/client';

export interface LeaderInput { fullName: string; role: string; phone: string; email?: string }
export interface StaffInput { imamCount?: number; teacherCount?: number; administrativeStaffCount?: number; otherStaffCount?: number }
export interface EducationInput { studentCount?: number; teacherCount?: number; educationLevels?: string[] }

export interface InstitutionApplicationInput {
  institutionName: string;
  institutionTypeId: string;
  establishmentDate: string;
  phone: string;
  email: string;
  alternativeName?: string;
  website?: string;
  secondaryPhone?: string;
  regionId: string;
  zoneId: string;
  subcityId?: string;
  districtId: string;
  address: string;
  mission?: string;
  description?: string;
  services?: string;
  communityActivities?: string;
  applicantName?: string;
  applicantPhone?: string;
  applicantEmail?: string;
  leaders: LeaderInput[];
  staff?: StaffInput;
  education?: EducationInput;
  documents?: Array<{ documentType: string; fileName: string; mimeType: string; size: number }>;
}

export type InstitutionApplicationUpdateInput = Partial<InstitutionApplicationInput>;

export interface DecisionInput { reason?: string }

export interface MemberRelationshipInput {
  relationshipType?: InstitutionRelationshipType;
}

export interface InstitutionListQuery {
  search?: string;
  institutionTypeId?: string;
  regionId?: string;
  zoneId?: string;
  subcityId?: string;
  districtId?: string;
  applicationStatus?: InstitutionApplicationStatus;
  institutionStatus?: InstitutionStatus;
  page?: number;
  pageSize?: number;
}

export interface InstitutionProfileUpdateInput {
  name?: string;
  alternativeName?: string;
  phone?: string;
  secondaryPhone?: string;
  email?: string;
  website?: string;
  address?: string;
  mission?: string;
  description?: string;
  services?: string;
  communityActivities?: string;
}

export const DOCUMENT_TYPES = ['ESTABLISHMENT_DOCUMENT', 'AUTHORIZATION_DOCUMENT', 'LEADERSHIP_DOCUMENT', 'LOCATION_DOCUMENT', 'OTHER'] as const;
export const LEADER_ROLES = ['CHAIRPERSON', 'IMAM', 'DIRECTOR', 'ADMINISTRATOR', 'MADRASA_HEAD', 'SECRETARY', 'OTHER'] as const;
export const EDUCATION_LEVELS = ['QURAN', 'HIFZ', 'BASIC_ISLAMIC_STUDIES', 'MADRASAH', 'ADULT_EDUCATION', 'OTHER'] as const;

export { InstitutionStatus, InstitutionApplicationStatus, InstitutionRelationshipType, InstitutionRelationshipStatus };
