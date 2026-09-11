import { PaymentInput } from '../payments/payment.types';

export const INDIVIDUAL_REGISTRATION_STATUSES = ['DRAFT','SUBMITTED','UNDER_REVIEW','CORRECTION','RESUBMITTED','APPROVED','REJECTED','REVOKED'] as const;
export type IndividualRegistrationStatus = (typeof INDIVIDUAL_REGISTRATION_STATUSES)[number];

export interface IndividualRegistrationInput {
  firstName: string; middleName?: string; lastName: string; birthDate: string; gender: string; maritalStatus: string; phone: string;
  educationLevel?: string; employmentStatus?: string; regionId: string; zoneId: string; subcityId?: string; districtId: string;
  currentAddress?: string; nationalIdentity?: string; institutionId?: string; familyRelationship?: string; familyMemberName?: string;
  familyMemberPhone?: string; declarationAccepted: boolean; payment: PaymentInput;
}

export interface IndividualRegistrationRecord extends IndividualRegistrationInput {
  id: string; trackingCode: string; status: IndividualRegistrationStatus; age: number; submittedAt: Date | null; createdAt: Date; updatedAt: Date; payment?: PaymentInput;
}

export interface ApplicationTrackingResult {
  type: RegistrationTypeValue; trackingCode: string; status: IndividualRegistrationStatus; submittedAt: Date | null; createdAt: Date; updatedAt: Date;
  nextAction: string; correctionRequirement?: string; decisionInformation?: string;
}

type RegistrationTypeValue = 'INDIVIDUAL' | 'INSTITUTION';
