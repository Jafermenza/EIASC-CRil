import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../apps/api/src/auth/crypto';

const prisma = new PrismaClient();
const ADMIN_EMAIL = 'e2e-m10-admin@example.test';
const ADMIN_PASSWORD = 'e2e-m10-password-12345';

test.beforeAll(async () => {
  const role = await prisma.role.findUniqueOrThrow({ where: { code: 'SUPER_ADMIN' } });
  const user = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { passwordHash: await hashPassword(ADMIN_PASSWORD), status: 'ACTIVE' },
    create: { email: ADMIN_EMAIL, passwordHash: await hashPassword(ADMIN_PASSWORD), status: 'ACTIVE', jurisdictionLevel: 'NATIONAL' },
  });
  await prisma.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: role.id } }, update: {}, create: { userId: user.id, roleId: role.id } });
});

test.afterAll(async () => { await prisma.$disconnect(); });

test('M10 settings acceptance: unauthenticated settings API is rejected', async ({ request }) => {
  const response = await request.get('http://127.0.0.1:4000/api/v1/settings');
  expect([401, 403, 404]).toContain(response.status());
});

test('M10 settings acceptance: invalid bearer credentials are rejected', async ({ request }) => {
  const response = await request.get('http://127.0.0.1:4000/api/v1/reports/dashboard', { headers: { authorization: 'Bearer invalid-m10-token' } });
  expect(response.status()).toBe(401);
});

test('M10 settings acceptance: admin settings surface is reachable after authentication', async ({ page }) => {
  const login = await page.request.post('http://127.0.0.1:4000/api/v1/auth/login', { data: { identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  expect(login.ok()).toBeTruthy();
  const { accessToken } = await login.json() as { accessToken: string };
  await page.goto('/login');
  await page.evaluate((token) => localStorage.setItem('accessToken', token), accessToken);
  const response = await page.goto('/admin/settings/notifications');
  expect(response?.ok()).toBeTruthy();
});
