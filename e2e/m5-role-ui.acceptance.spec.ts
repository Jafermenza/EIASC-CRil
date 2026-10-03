import { expect, Page, test } from '@playwright/test';
import { PrismaClient, JurisdictionLevel, RoleCode } from '@prisma/client';
import { hashPassword } from '../apps/api/src/auth/crypto';

const prisma = new PrismaClient();
const PASSWORD = 'phase5-password-12345';

const roleCases: Array<{ role: RoleCode; email: string; expectedPath: string; heading: RegExp }> = [
  { role: RoleCode.NATIONAL_ADMIN, email: 'e2e-phase5-national@example.test', expectedPath: '/admin/dashboard', heading: /National operations/i },
  { role: RoleCode.REGIONAL_ADMIN, email: 'e2e-phase5-regional@example.test', expectedPath: '/admin/dashboard', heading: /Regional operations/i },
  { role: RoleCode.DISTRICT_ADMIN, email: 'e2e-phase5-district@example.test', expectedPath: '/admin/dashboard', heading: /District operations/i },
  { role: RoleCode.REGISTRAR, email: 'e2e-phase5-registrar@example.test', expectedPath: '/admin/dashboard', heading: /Registrar workspace/i },
  { role: RoleCode.FINANCE_OFFICER, email: 'e2e-phase5-finance@example.test', expectedPath: '/admin/dashboard', heading: /Finance workspace/i },
  { role: RoleCode.INSTITUTION_ADMIN, email: 'e2e-phase5-institution@example.test', expectedPath: '/institution', heading: /Institution portal/i },
  { role: RoleCode.MEMBER, email: 'e2e-phase5-member@example.test', expectedPath: '/member', heading: /Member portal/i },
];

async function upsertRoleUser(role: RoleCode, email: string) {
  const roleRecord = await prisma.role.findUniqueOrThrow({ where: { code: role } });
  const region = await prisma.region.findUnique({ where: { code: 'E2E-REGION' } });
  const district = await prisma.district.findUnique({ where: { code: 'E2E-DISTRICT' } });
  const institution = await prisma.institution.findUnique({ where: { institutionCode: 'E2E-INSTITUTION' } });
  const jurisdictionLevel =
    role === RoleCode.REGIONAL_ADMIN ? JurisdictionLevel.REGION :
    role === RoleCode.DISTRICT_ADMIN ? JurisdictionLevel.DISTRICT :
    role === RoleCode.INSTITUTION_ADMIN ? JurisdictionLevel.INSTITUTION :
    JurisdictionLevel.NATIONAL;
  const jurisdictionId =
    role === RoleCode.REGIONAL_ADMIN ? region?.id :
    role === RoleCode.DISTRICT_ADMIN ? district?.id :
    role === RoleCode.INSTITUTION_ADMIN ? institution?.id :
    null;
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash: await hashPassword(PASSWORD), status: 'ACTIVE', jurisdictionLevel, jurisdictionId, institutionId: role === RoleCode.INSTITUTION_ADMIN ? institution?.id : null },
    create: { email, passwordHash: await hashPassword(PASSWORD), status: 'ACTIVE', jurisdictionLevel, jurisdictionId, institutionId: role === RoleCode.INSTITUTION_ADMIN ? institution?.id : null },
  });
  await prisma.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: roleRecord.id } }, update: {}, create: { userId: user.id, roleId: roleRecord.id } });
  return user;
}

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email address or phone number').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test.beforeAll(async () => {
  for (const item of roleCases) await upsertRoleUser(item.role, item.email);
});

test.afterAll(async () => prisma.$disconnect());

for (const item of roleCases) {
  test(`Phase 5 role navigation: ${item.role}`, async ({ page }) => {
    await signIn(page, item.email);
    await expect(page).toHaveURL(new RegExp(item.expectedPath.replaceAll('/', '\\/') + '$'));
    await expect(page.getByText(item.heading)).toBeVisible();

    if (item.role === RoleCode.FINANCE_OFFICER) {
      await expect(page.getByRole('link', { name: 'Registration payments' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Review applications' })).toHaveCount(0);
    } else if (item.role === RoleCode.DISTRICT_ADMIN) {
      await expect(page.getByRole('link', { name: 'Review applications' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Reports & trends' })).toBeVisible();
    } else if ([RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.REGISTRAR].includes(item.role)) {
      await expect(page.getByRole('link', { name: 'Review applications' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Reports & trends' })).toBeVisible();
      await page.goto('/admin/directory/members');
      await expect(page.getByLabel('Region')).toBeVisible();
      await expect(page.getByLabel('Registered from')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible();
      await page.goto('/admin/users');
      await expect(page.getByText('Users & accounts catalog')).toBeVisible();
      await expect(page.getByText('Export filtered CSV')).toBeVisible();
      await page.goto('/admin/directory/institutions');
      await expect(page.getByLabel('Organization type')).toBeVisible();
      await expect(page.getByLabel('Zone / City')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible();
    } else if (item.role === RoleCode.INSTITUTION_ADMIN) {
      await expect(page.getByText('INSTITUTION PORTAL')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Manage members' })).toBeVisible();
    } else if (item.role === RoleCode.MEMBER) {
      await expect(page.getByText('MEMBER PORTAL')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Open my digital ID' })).toBeVisible();
    }
  });
}


test('Phase 5 applicant workspace: tracking dashboard exposes plain-language next actions', async ({ page }) => {
  await page.goto('/track');
  await expect(page.getByText('APPLICANT DASHBOARD')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Track your application' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Check status/ })).toBeVisible();
});
