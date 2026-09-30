import { test, expect } from '@playwright/test';

test.describe('M11 PWA / Offline / App Experience', () => {
  test('serves an installable manifest with app-like metadata', async ({ request }) => {
    const manifest = await request.get('http://127.0.0.1:3000/manifest.webmanifest');
    expect(manifest.ok()).toBeTruthy();
    const body = await manifest.json() as {
      name?: string;
      short_name?: string;
      start_url?: string;
      display?: string;
      icons?: Array<{ sizes?: string; src?: string }>;
    };

    expect(body.name).toContain('EIASC');
    expect(body.short_name).toBe('EIASC CRil');
    expect(body.start_url).toBe('/login');
    expect(body.display).toBe('standalone');
    expect(body.icons?.some((icon) => icon.sizes === '192x192')).toBeTruthy();
    expect(body.icons?.some((icon) => icon.sizes === '512x512')).toBeTruthy();
  });

  test('registers the service worker and exposes offline fallback', async ({ page, context }) => {
    await page.goto('http://127.0.0.1:3000/login');
    await page.waitForFunction(() => navigator.serviceWorker?.controller !== null);

    const registration = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration('/');
      return { active: Boolean(reg?.active), scope: reg?.scope ?? '' };
    });
    expect(registration.active).toBeTruthy();
    expect(registration.scope).toContain('/');

    await context.setOffline(true);
    await page.goto('http://127.0.0.1:3000/m11-offline-check', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: "You're offline" })).toBeVisible();
    await expect(page.getByText(/Previously visited pages may still be available/i)).toBeVisible();
    await context.setOffline(false);
  });

  test('keeps the public experience usable at mobile width without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://127.0.0.1:3000/login');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBeFalsy();
  });
});
