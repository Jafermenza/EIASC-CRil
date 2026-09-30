import { test, expect } from '@playwright/test';

const API = 'http://127.0.0.1:4000/api/v1';

test('M12 hardening acceptance: security headers are present', async ({ request }) => {
  const response = await request.get(`${API}/auth/login`);
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
  expect(response.headers()['x-frame-options']).toBe('DENY');
  expect(response.headers()['referrer-policy']).toBe('no-referrer');
  expect(response.headers()['permissions-policy']).toContain('camera=()');
  expect(response.headers()['cross-origin-opener-policy']).toBe('same-origin');
  expect(response.headers()['cross-origin-resource-policy']).toBe('same-origin');
  expect(response.headers()['x-request-id']).toBeTruthy();
});

test('M12 hardening acceptance: authentication endpoint is throttled', async ({ request }) => {
  let limited = false;
  for (let attempt = 0; attempt < 11; attempt += 1) {
    const response = await request.post(`${API}/auth/login`, {
      data: { identifier: 'm12-invalid@example.test', password: 'definitely-invalid' },
    });
    if (response.status() === 429) {
      limited = true;
      expect(response.headers()['retry-after']).toBeTruthy();
      const body = await response.json() as { error?: { code?: string } };
      expect(body.error?.code).toBe('RATE_LIMITED');
      break;
    }
  }
  expect(limited).toBe(true);
});

test('M12 hardening acceptance: invalid request IDs are replaced', async ({ request }) => {
  const response = await request.get(`${API}/auth/login`, {
    headers: { 'x-request-id': '<script>alert(1)</script>' },
  });
  expect(response.headers()['x-request-id']).toMatch(/^[0-9a-f-]{36}$/i);
});

test('M12 hardening acceptance: web security headers are present', async ({ page }) => {
  const response = await page.goto('/login');
  expect(response?.ok()).toBeTruthy();
  expect(response?.headers()['x-content-type-options']).toBe('nosniff');
  expect(response?.headers()['x-frame-options']).toBe('DENY');
  expect(response?.headers()['strict-transport-security']).toContain('max-age=31536000');
});
