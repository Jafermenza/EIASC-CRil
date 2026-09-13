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

test('M9 notifications: in-app event, admin configuration, templates and provider readiness', async ({ page, request }) => {
  await signIn(page);
  const login = await request.post('http://127.0.0.1:4000/api/v1/auth/login', { data: { identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  expect(login.ok()).toBeTruthy();
  const { accessToken } = await login.json() as { accessToken: string };
  const headers = { authorization: `Bearer ${accessToken}` };

  const settings = await request.get('http://127.0.0.1:4000/api/v1/notifications/settings/admin', { headers });
  expect(settings.ok()).toBeTruthy();
  const before = await settings.json() as { sms: { configured: boolean; enabled: boolean }; email: { configured: boolean }; eventToggles: Record<string, boolean>; templates: Record<string, string>; templateVariables: string[] };
  expect(typeof before.sms.configured).toBe('boolean');
  expect(typeof before.email.configured).toBe('boolean');
  expect(before.eventToggles.REGISTRATION_SUBMITTED).toBe(true);
  expect(before.templates.REGISTRATION_SUBMITTED).toContain('{{trackingCode}}');
  expect(before.templateVariables).toContain('trackingCode');

  const testEvent = `M9-E2E-${Date.now()}`;
  const emitted = await request.post('http://127.0.0.1:4000/api/v1/notifications/test-in-app', {
    headers,
    data: { type: 'REGISTRATION_SUBMITTED', message: `Notification acceptance ${testEvent}` },
  });
  expect(emitted.ok()).toBeTruthy();
  const emittedBody = await emitted.json() as { status: string; channel: string; message: string };
  expect(emittedBody.status).toBe('SENT');
  expect(emittedBody.channel).toBe('IN_APP');

  const listed = await request.get('http://127.0.0.1:4000/api/v1/notifications?unreadOnly=true', { headers });
  expect(listed.ok()).toBeTruthy();
  const notifications = await listed.json() as Array<{ type: string; message: string; readAt: string | null }>;
  const created = notifications.find((item) => item.message.includes(testEvent));
  expect(created).toBeTruthy();
  expect(created?.type).toBe('REGISTRATION_SUBMITTED');
  expect(created?.readAt).toBeNull();

  const saved = await request.put('http://127.0.0.1:4000/api/v1/notifications/settings/admin', {
    headers,
    data: {
      eventToggles: { REGISTRATION_SUBMITTED: false },
      templates: { REGISTRATION_SUBMITTED: 'EIASC test {{trackingCode}}' },
    },
  });
  expect(saved.ok()).toBeTruthy();
  const savedBody = await saved.json() as { eventToggles: Record<string, boolean>; templates: Record<string, string> };
  expect(savedBody.eventToggles.REGISTRATION_SUBMITTED).toBe(false);
  expect(savedBody.templates.REGISTRATION_SUBMITTED).toBe('EIASC test {{trackingCode}}');

  const disabledEvent = await request.post('http://127.0.0.1:4000/api/v1/notifications/test-in-app', {
    headers,
    data: { type: 'REGISTRATION_SUBMITTED', message: `disabled ${testEvent}` },
  });
  expect(disabledEvent.ok()).toBeTruthy();

  const restored = await request.put('http://127.0.0.1:4000/api/v1/notifications/settings/admin', {
    headers,
    data: { eventToggles: { REGISTRATION_SUBMITTED: true } },
  });
  expect(restored.ok()).toBeTruthy();

  await page.goto('/admin/settings/sms');
  await expect(page.getByRole('heading', { name: 'Notification services' })).toBeVisible();
  await expect(page.getByText('Event delivery')).toBeVisible();
  await expect(page.getByText('AfroMessage', { exact: false })).toBeVisible();

  const emailTest = await request.post('http://127.0.0.1:4000/api/v1/notifications/test-email', { headers });
  if (before.email.configured) expect(emailTest.ok()).toBeTruthy();
  else expect([503, 502]).toContain(emailTest.status());

  const smsTest = await request.post('http://127.0.0.1:4000/api/v1/notifications/test-sms', { headers });
  if (before.sms.configured && before.sms.enabled) expect(smsTest.ok()).toBeTruthy();
  else expect([503, 502]).toContain(smsTest.status());

  const readId = (await emitted.json() as { id: string }).id;
  const read = await request.patch(`http://127.0.0.1:4000/api/v1/notifications/${readId}/read`, { headers });
  expect(read.ok()).toBeTruthy();
  expect((await read.json() as { status: string }).status).toBe('READ');
});
