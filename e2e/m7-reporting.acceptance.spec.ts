import { expect, Page, test } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ADMIN_EMAIL = 'e2e-admin@example.test';
const ADMIN_PASSWORD = 'e2e-password-12345';

async function signIn(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email address or phone number').fill(ADMIN_EMAIL);
  await page.getByLabel('Password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
}

test.afterAll(async () => prisma.$disconnect());

test('M7 reporting: dashboard metrics, date filtering, regional breakdown and CSV export', async ({ page, request }) => {
  await signIn(page);
  const institution = await prisma.institution.findUniqueOrThrow({ where: { institutionCode: 'E2E-INSTITUTION' } });
  const member = await prisma.member.findUniqueOrThrow({ where: { membershipNumber: 'E2E-MEMBER-0001' } });
  const login = await request.post('http://127.0.0.1:4000/api/v1/auth/login', { data: { identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  expect(login.ok()).toBeTruthy();
  const { accessToken } = await login.json() as { accessToken: string };
  const headers = { authorization: `Bearer ${accessToken}` };

  const credential = await request.post('http://127.0.0.1:4000/api/v1/credentials', {
    headers,
    data: { type: 'MEMBER', subjectId: member.id },
  });
  expect([200, 201]).toContain(credential.status());

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
