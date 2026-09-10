export const INDIVIDUAL_REGISTRATION_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'CORRECTION',
  'RESUBMITTED',
  'APPROVED',
  'REJECTED',
  'REVOKED',
] as const;

export type IndividualRegistrationStatus = (typeof INDIVIDUAL_REGISTRATION_STATUSES)[number];

export interface IndividualRegistrationInput {
  firstName: string;
  middleName?: string;
  lastName: string;
  birthDate: string;
  gender: string;
  maritalStatus: string;
  phone: string;
  educationLevel?: string;
  employmentStatus?: string;
  regionId: string;
  zoneId: string;
  subcityId: string;
  districtId: string;
  currentAddress?: string;
  nationalIdentity?: string;
  institutionId?: string;
  declarationAccepted: boolean;
}

export interface IndividualRegistrationRecord extends IndividualRegistrationInput {
  id: string;
  trackingCode: string;
  status: IndividualRegistrationStatus;
  age: number;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
