import { InstitutionRelationshipType, MembershipStatus } from '@prisma/client';

export interface MembershipCreateInput {
  memberId: string;
  institutionId: string;
  relationshipType?: InstitutionRelationshipType;
}

export interface MembershipStatusInput {
  status: MembershipStatus;
  reason?: string;
}
