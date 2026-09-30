import { expect, Page, test } from '@playwright/test';
import { PrismaClient, CredentialType, CredentialStatus } from '@prisma/client';

const prisma = new PrismaClient();
const ADMIN_EMAIL = 'e2e-admin@example.test';
const ADMIN_PASSWORD = 'e2e-password-12345';
const E2E_MEMBER_NUMBER = 'E2E-M7-MEMBER-0001';
const E2E_CREDENTIAL_NUMBER = 'E2E-M7-CREDENTIAL-0001';
const E2E_TOKEN_HASH = 'e2e-m7-reporting-token-hash-0001';

async function signIn(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email address or phone number').fill(ADMIN_EMAIL);
  await page.getByLabel('Password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
}

test.beforeAll(async () => {
  const region = await prisma.region.findUniqueOrThrow({ where: { code: 'E2E-REGION' } });
  const zone = await prisma.zoneCity.findUniqueOrThrow({ where: { code: 'E2E-ZONE' } });
  const subcity = await prisma.subcityTown.findUniqueOrThrow({ where: { code: 'E2E-SUBCITY' } });
  const district = await prisma.district.findUniqueOrThrow({ where: { code: 'E2E-DISTRICT' } });

  // M7 owns its reporting fixture. Do not invoke M5 credential automation here.
  // Keeping the member PENDING prevents the M5 ACTIVE-member trigger from running.
  const member = await prisma.member.upsert({
    where: { membershipNumber: E2E_MEMBER_NUMBER },
    update: { status: 'PENDING' },
    create: {
      membershipNumber: E2E_MEMBER_NUMBER,
      firstName: 'M7',
      lastName: 'Reporting Member',
      birthDate: new Date('1990-01-01'),
      gender: 'OTHER',
      maritalStatus: 'SINGLE',
      phone: '+251911000007',
      regionId: region.id,
      zoneId: zone.id,
      subcityId: subcity.id,
      districtId: district.id,
      status: 'PENDING',
    },
  });

  await prisma.credential.upsert({
    where: { credentialNumber: E2E_CREDENTIAL_NUMBER },
    update: {
      status: CredentialStatus.ACTIVE,
      memberId: member.id,
      institutionId: null,
      licenseId: null,
      expiresAt: null,
    },
    create: {
      credentialNumber: E2E_CREDENTIAL_NUMBER,
      type: CredentialType.MEMBER,
      status: CredentialStatus.ACTIVE,
      tokenHash: E2E_TOKEN_HASH,
      memberId: member.id,
      issuedAt: new Date(),
    },
  });
});

test.afterAll(async () => prisma.$disconnect());

test('M7 reporting: dashboard metrics, date filtering, regional breakdown and CSV export', async ({ page, request }) => {
  await signIn(page);
  const institution = await prisma.institution.findUniqueOrThrow({ where: { institutionCode: 'E2E-INSTITUTION' } });
  const login = await request.post('http://127.0.0.1:4000/api/v1/auth/login', { data: { identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  expect(login.ok()).toBeTruthy();
  const { accessToken } = await login.json() as { accessToken: string };
  const headers = { authorization: `Bearer ${accessToken}` };

  const dashboard = await request.get('http://127.0.0.1:4000/api/v1/reports/dashboard', { headers });
  expect(dashboard.ok()).toBeTruthy();
  const data = await dashboard.json() as Record<string, number>;
  expect(data.credentialIssued).toBeGreaterThan(0);
  expect(data.memberCredentialsIssued).toBeGreaterThan(0);
  expect(typeof data.activeCredentials).toBe('number');
  expect(typeof data.expiredCredentials).toBe('number');
  expect(typeof data.revokedCredentials).toBe('number');

  const trend = await request.get('http://127.0.0.1:4000/api/v1/reports/trend?months=12', { headers });
  expect(trend.ok()).toBeTruthy();
  expect(await trend.json()).toHaveLength(12);

  const regional = await request.get('http://127.0.0.1:4000/api/v1/reports/regional', { headers });
  expect(regional.ok()).toBeTruthy();
  const regionalRows = await regional.json() as Array<{ regionId: string; region: string; members: number; institutions: number; credentials: number }>;
  expect(regionalRows.some((row) => row.regionId === institution.regionId)).toBeTruthy();

  const future = await request.get('http://127.0.0.1:4000/api/v1/reports/dashboard?from=2099-01-01&to=2099-01-02', { headers });
  expect(future.ok()).toBeTruthy();
  const futureData = await future.json() as Record<string, number>;
  expect(futureData.credentialIssued).toBe(0);
  expect(futureData.members).toBe(0);

  await page.goto('/admin/reports');
  await expect(page.getByRole('heading', { name: 'Reports & dashboards' })).toBeVisible();
  await expect(page.getByText('Member IDs issued')).toBeVisible();
  await expect(page.getByText('Regional breakdown')).toBeVisible();

  const exported = await request.get('http://127.0.0.1:4000/api/v1/reports/export', { headers });
  expect(exported.ok()).toBeTruthy();
  expect(exported.headers()['content-type']).toContain('text/csv');
  expect(await exported.text()).toContain('dashboard,credentialIssued');
});
