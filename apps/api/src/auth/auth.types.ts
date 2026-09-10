import { RoleCode, JurisdictionLevel } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string | null;
  phone: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
  roles: RoleCode[];
  jurisdictionLevel: JurisdictionLevel;
  jurisdictionId: string | null;
  institutionId: string | null;
}

export interface AccessTokenPayload {
  sub: string;
  type: 'access';
  iss: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string;
  type: 'refresh';
  jti: string;
  iss: string;
  iat: number;
  exp: number;
}
