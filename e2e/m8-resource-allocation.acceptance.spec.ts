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

test.beforeAll(async () => {
  const institution = await prisma.institution.findUniqueOrThrow({ where: { institutionCode: 'E2E-INSTITUTION' } });
  const member = await prisma.member.findUniqueOrThrow({ where: { membershipNumber: 'E2E-MEMBER-0001' } });
  await prisma.memberInstitution.upsert({
    where: { memberId_institutionId: { memberId: member.id, institutionId: institution.id } },
    update: { status: 'ACTIVE', endedAt: null },
    create: { memberId: member.id, institutionId: institution.id, status: 'ACTIVE' },
  });
});

test.afterAll(async () => prisma.$disconnect());

test('M8 allocation: policy, eligibility, preview, review, finalize, history and export', async ({ page, request }) => {
  await signIn(page);
  const login = await request.post('http://127.0.0.1:4000/api/v1/auth/login', { data: { identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  expect(login.ok()).toBeTruthy();
  const { accessToken } = await login.json() as { accessToken: string };
  const headers = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };
  const version = `e2e-${Date.now()}`;

  const policyResponse = await request.post('http://127.0.0.1:4000/api/v1/allocations/policies', {
    headers,
    data: {
      name: 'E2E Resource Allocation Policy',
      version,
      eligibilityRules: { minimumActiveMembers: 1 },
      formulaDefinition: { perMemberMultiplier: 0.5, equalizationPerInstitution: 10, minimumInstitutionAmount: 0, maximumInstitutionAmount: 2000 },
    },
  });
  expect(policyResponse.status()).toBe(201);
  const policy = await policyResponse.json() as { id: string; status: string; version: string };
  expect(policy.status).toBe('DRAFT');
  expect(policy.version).toBe(version);

  const approve = await request.patch(`http://127.0.0.1:4000/api/v1/allocations/policies/${policy.id}/approve`, { headers });
  expect(approve.ok()).toBeTruthy();
  expect((await approve.json()).status).toBe('APPROVED');

  const preview = await request.post('http://127.0.0.1:4000/api/v1/allocations/runs/preview', {
    headers,
    data: { policyId: policy.id, period: '2026-Q1', fundingPool: 2000 },
  });
  expect(preview.status()).toBe(201);
  const run = await preview.json() as { id: string; status: string; policyVersion: string; eligibleMemberCount: number; totalAllocated: string | number };
  expect(run.status).toBe('PREVIEW');
  expect(run.policyVersion).toBe(version);
  expect(run.eligibleMemberCount).toBeGreaterThan(0);
  expect(Number(run.totalAllocated)).toBeGreaterThan(0);
  expect(Number(run.totalAllocated)).toBeLessThanOrEqual(2000);

  const review = await request.patch(`http://127.0.0.1:4000/api/v1/allocations/runs/${run.id}/review`, { headers });
  expect(review.ok()).toBeTruthy();
  expect((await review.json()).status).toBe('UNDER_REVIEW');

  const finalize = await request.patch(`http://127.0.0.1:4000/api/v1/allocations/runs/${run.id}/finalize`, { headers });
  expect(finalize.ok()).toBeTruthy();
  const finalized = await finalize.json() as { status: string; approvedAt: string | null };
  expect(finalized.status).toBe('FINALIZED');
  expect(finalized.approvedAt).toBeTruthy();

  const detail = await request.get(`http://127.0.0.1:4000/api/v1/allocations/runs/${run.id}`, { headers });
  expect(detail.ok()).toBeTruthy();
  const detailBody = await detail.json() as { policy: { version: string }; results: Array<{ institutionId: string; totalAmount: string | number }> };
  expect(detailBody.policy.version).toBe(version);
  expect(detailBody.results.length).toBeGreaterThan(0);

  const history = await request.get('http://127.0.0.1:4000/api/v1/allocations/runs', { headers });
  expect(history.ok()).toBeTruthy();
  const historyBody = await history.json() as Array<{ id: string; status: string }>;
  expect(historyBody.some((item) => item.id === run.id && item.status === 'FINALIZED')).toBeTruthy();

  const exported = await request.get(`http://127.0.0.1:4000/api/v1/allocations/runs/${run.id}/export`, { headers });
  expect(exported.ok()).toBeTruthy();
  expect(exported.headers()['content-type']).toContain('text/csv');
  expect(await exported.text()).toContain('institutionId,institutionCode,institutionName');

  await page.goto('/admin/allocations');
  await expect(page.getByRole('heading', { name: 'Resource allocation' })).toBeVisible();
  await expect(page.getByText('Allocation history')).toBeVisible();
});
