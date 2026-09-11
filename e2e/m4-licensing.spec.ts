import { expect, test } from '@playwright/test';

test('completes the database-backed M4 licensing journey and public verification', async ({ page }) => {
  await waitForApi(page);
  await page.goto('/login');
  await page.getByLabel('Email address or phone number').fill('e2e-admin@example.test');
  await page.getByLabel('Password').fill('e2e-password-12345');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin\/licenses$/);

  await page.getByLabel('Approved institution ID').fill(await institutionId(page));
  await page.getByRole('button', { name: 'Create application' }).click();
  await expect(page).toHaveURL(/\/admin\/licenses\/.+/);
  await page.getByRole('button', { name: 'Start review' }).click();
  await page.getByRole('button', { name: 'Approve application' }).click();
  await page.getByLabel('Expiry date and time').fill('2099-12-31T23:59');
  await page.getByRole('button', { name: 'Issue license' }).click();
  const licenseNumber = (await page.locator('dd').filter({ hasText: /^EIASC-L-\d{4}-[A-Z0-9]{6}$/ }).textContent())?.trim();
  expect(licenseNumber).toBeTruthy();

  await page.goto('/verify');
  await page.getByLabel('License number').fill(licenseNumber!);
  await page.getByRole('button', { name: 'Verify license' }).click();
  await expect(page.getByText('E2E Approved Mosque')).toBeVisible();
  await expect(page.getByText('VERIFIED LICENSE')).toBeVisible();
});

async function waitForApi(page: import('@playwright/test').Page) {
  await expect.poll(async () => {
    try {
      return (await page.request.get('http://127.0.0.1:4000/api/v1/health')).status();
    } catch {
      return 0;
    }
  }, { timeout: 30_000 }).toBe(200);
}

async function institutionId(page: import('@playwright/test').Page) {
  const body = await page.evaluate(async () => {
    const token = localStorage.getItem('accessToken') || '';
    const response = await fetch('/api/v1/institutions?search=E2E-INSTITUTION', { headers: { authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error('Unable to find E2E institution');
    return response.json() as Promise<{ items: { id: string }[] }>;
  });
  expect(body.items).toHaveLength(1);
  return body.items[0].id;
}
