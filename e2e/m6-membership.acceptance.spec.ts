import { test, expect, Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ADMIN_EMAIL = 'e2e-admin@example.test';
const ADMIN_PASSWORD = ['e2e-password', '12345'].join('-');

async function signIn(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email address or phone number').fill(ADMIN_EMAIL);
  await page.getByLabel('Password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
}

test.afterAll(async () => prisma.$disconnect());

test('M6 institutional membership lifecycle: request, approve, display, suspend and end', async ({ page, request }) => {
  await signIn(page);
  const institution = await prisma.institution.findUniqueOrThrow({ where: { institutionCode: 'E2E-INSTITUTION' } });
  const member = await prisma.member.findUniqueOrThrow({ where: { membershipNumber: 'E2E-MEMBER-0001' } });
  const login = await request.post('http://127.0.0.1:4000/api/v1/auth/login', { data: { identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  expect(login.ok()).toBeTruthy();
  const { accessToken } = await login.json() as { accessToken: string };
  const headers = { authorization: `Bearer ${accessToken}` };

  const membership = await request.post('http://127.0.0.1:4000/api/v1/memberships', {
    headers,
    data: { memberId: member.id, institutionId: institution.id, relationshipType: 'PRIMARY' },
  });
  expect(membership.status()).toBe(201);
  const created = await membership.json();
  expect(created.status).toBe('PENDING');

  const approval = await request.patch(`http://127.0.0.1:4000/api/v1/memberships/${created.id}/status`, { headers, data: { status: 'ACTIVE' } });
  expect(approval.ok()).toBeTruthy();

  await page.evaluate((id) => localStorage.setItem('institutionId', id), institution.id);
  await page.goto('/institution/members');
  await expect(page.getByText('E2E Member')).toBeVisible();
  await expect(page.getByText('ACTIVE', { exact: true }).last()).toBeVisible();

  const suspension = await request.patch(`http://127.0.0.1:4000/api/v1/memberships/${created.id}/status`, { headers, data: { status: 'SUSPENDED' } });
  expect(suspension.ok()).toBeTruthy();
  expect((await suspension.json()).status).toBe('SUSPENDED');

  const ending = await request.patch(`http://127.0.0.1:4000/api/v1/memberships/${created.id}/status`, { headers, data: { status: 'ENDED' } });
  expect(ending.ok()).toBeTruthy();
  const ended = await ending.json();
  expect(ended.status).toBe('ENDED');
  expect(ended.endedAt).toBeTruthy();

  const persisted = await prisma.memberInstitution.findUniqueOrThrow({ where: { id: created.id } });
  expect(persisted.status).toBe('ENDED');
  expect(persisted.endedAt).toBeTruthy();
  const audit = await prisma.auditLog.findMany({ where: { entityType: 'MemberInstitution', entityId: created.id } });
  expect(audit.map((entry) => entry.action)).toEqual(expect.arrayContaining(['MEMBERSHIP_REQUESTED', 'MEMBERSHIP_ACTIVE', 'MEMBERSHIP_SUSPENDED', 'MEMBERSHIP_ENDED']));
});
