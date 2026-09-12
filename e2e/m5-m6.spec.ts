import { test, expect, Page } from '@playwright/test';
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
  const region = await prisma.region.findUniqueOrThrow({ where: { code: 'E2E-REGION' } });
  const zone = await prisma.zoneCity.findUniqueOrThrow({ where: { code: 'E2E-ZONE' } });
  const subcity = await prisma.subcityTown.findUniqueOrThrow({ where: { code: 'E2E-SUBCITY' } });
  const district = await prisma.district.findUniqueOrThrow({ where: { code: 'E2E-DISTRICT' } });
  const member = await prisma.member.upsert({ where: { membershipNumber: 'E2E-MEMBER-0001' }, update: { status: 'ACTIVE' }, create: { membershipNumber: 'E2E-MEMBER-0001', firstName: 'E2E', lastName: 'Member', birthDate: new Date('1990-01-01'), gender: 'OTHER', maritalStatus: 'SINGLE', phone: '+251911000001', regionId: region.id, zoneId: zone.id, subcityId: subcity.id, districtId: district.id, status: 'ACTIVE' } });
  await prisma.memberInstitution.deleteMany({ where: { memberId: member.id, institutionId: institution.id } });
  await prisma.license.deleteMany({ where: { institutionId: institution.id } });
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: ADMIN_EMAIL } });
  await prisma.license.create({ data: { institutionId: institution.id, licenseNumber: 'EIASC-L-2026-E2E001', licenseType: 'STANDARD', status: 'ACTIVE', applicationStatus: 'APPROVED', issuedAt: new Date(), effectiveFrom: new Date(), expiresAt: new Date('2027-12-31'), issuedBy: admin.id, approvedBy: admin.id, createdBy: admin.id, approvedAt: new Date() } });
});

test.afterAll(async () => { await prisma.$disconnect(); });

test('M5 credentials: issue and publicly verify member, institution and license credentials', async ({ page, request }) => {
  await signIn(page);
  const institution = await prisma.institution.findUniqueOrThrow({ where: { institutionCode: 'E2E-INSTITUTION' } });
  const member = await prisma.member.findUniqueOrThrow({ where: { membershipNumber: 'E2E-MEMBER-0001' } });
  const license = await prisma.license.findFirstOrThrow({ where: { institutionId: institution.id, status: 'ACTIVE' } });
  const login = await request.post('http://127.0.0.1:4000/api/v1/auth/login', { data: { identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  expect(login.ok()).toBeTruthy();
  const auth = await login.json();
  const token = auth.accessToken as string;

  for (const subject of [{ type: 'INSTITUTION', id: institution.id }, { type: 'MEMBER', id: member.id }, { type: 'LICENSE', id: license.id }]) {
    await page.goto('/admin/credentials');
    await page.getByLabel('Credential type').selectOption(subject.type);
    await page.getByLabel('Subject ID').fill(subject.id);
    await page.getByRole('button', { name: 'Issue credential' }).click();

    const verificationLink = page.locator('a').filter({ hasText: '/verify/' }).last();
    await expect(verificationLink).toBeVisible();
    const href = await verificationLink.getAttribute('href');
    expect(href).toMatch(/\/verify\/.+/);

    if (subject.type === 'LICENSE') {
      const credential = await prisma.credential.findFirstOrThrow({
        where: { type: 'LICENSE', licenseId: license.id, status: 'ACTIVE' },
        orderBy: { issuedAt: 'desc' },
      });
      const publication = await prisma.credentialPublication.findUniqueOrThrow({ where: { credentialId: credential.id } });
      if (publication.publicationStatus !== 'PUBLISHED') {
        const publish = await request.post(`http://127.0.0.1:4000/api/v1/credentials/${credential.id}/publish`, {
          headers: { authorization: `Bearer ${token}` },
        });
        expect(publish.ok()).toBeTruthy();
      }
    }

    await page.goto(href!);
    await expect(page.getByRole('heading', { name: 'Credential verified' })).toBeVisible();
  }
});

test('M6 membership: request, approve, display and end an institutional membership', async ({ page, request }) => {
  await signIn(page);
  const institution = await prisma.institution.findUniqueOrThrow({ where: { institutionCode: 'E2E-INSTITUTION' } });
  const member = await prisma.member.findUniqueOrThrow({ where: { membershipNumber: 'E2E-MEMBER-0001' } });
  const login = await request.post('http://127.0.0.1:4000/api/v1/auth/login', { data: { identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  expect(login.ok()).toBeTruthy();
  const auth = await login.json();
  const token = auth.accessToken as string;
  const membership = await request.post('http://127.0.0.1:4000/api/v1/memberships', { headers: { authorization: `Bearer ${token}` }, data: { memberId: member.id, institutionId: institution.id, relationshipType: 'PRIMARY' } });
  expect(membership.status()).toBe(201);
  const created = await membership.json();
  const approval = await request.patch(`http://127.0.0.1:4000/api/v1/memberships/${created.id}/status`, { headers: { authorization: `Bearer ${token}` }, data: { status: 'ACTIVE' } });
  expect(approval.ok()).toBeTruthy();
  await page.evaluate((id) => localStorage.setItem('institutionId', id), institution.id);
  await page.goto('/institution/members');
  await expect(page.getByText('E2E Member')).toBeVisible();
  await expect(page.getByText('ACTIVE', { exact: true }).last()).toBeVisible();
  const ending = await request.patch(`http://127.0.0.1:4000/api/v1/memberships/${created.id}/status`, { headers: { authorization: `Bearer ${token}` }, data: { status: 'ENDED' } });
  expect(ending.ok()).toBeTruthy();
});
