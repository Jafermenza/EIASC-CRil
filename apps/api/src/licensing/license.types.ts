import { LicenseApplicationStatus, LicenseStatus } from '@prisma/client';

export interface LicenseListQuery {
  page?: string | number;
  pageSize?: string | number;
  status?: LicenseStatus;
  applicationStatus?: LicenseApplicationStatus;
  regionId?: string;
  zoneId?: string;
  subcityId?: string;
  districtId?: string;
  institutionId?: string;
  search?: string;
}

export interface CreateLicenseInput {
  institutionId?: string;
  licenseType?: string;
}

export interface LicenseReasonInput {
  reason?: string;
}

export interface RenewLicenseInput {
  expiresAt?: string;
}
