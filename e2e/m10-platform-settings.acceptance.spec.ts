import { test, expect } from '@playwright/test';

test('M10 platform settings acceptance: settings surface is protected', async ({ page }) => {
  const response = await page.goto('/admin/settings/notifications');
  expect(response).toBeTruthy();
  expect([200, 302, 307, 401, 403]).toContain(response?.status() ?? 0);
  expect(response?.headers()['x-content-type-options']).toBe('nosniff');
  expect(response?.headers()['x-frame-options']).toBe('DENY');
});

test('M10 platform settings acceptance: unauthenticated settings API is rejected', async ({ request }) => {
  const response = await request.get('http://127.0.0.1:4000/api/v1/settings');
  expect([401, 403, 404]).toContain(response.status());
});

test('M10 platform settings acceptance: public API rejects invalid bearer credentials', async ({ request }) => {
  const response = await request.get('http://127.0.0.1:4000/api/v1/reports/dashboard', {
    headers: { authorization: 'Bearer invalid-m10-token' },
  });
  expect(response.status()).toBe(401);
});
