import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:3000',
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      API_PORT: '4000',
      WEB_ORIGIN: 'http://127.0.0.1:3000',
      JWT_SECRET: process.env.JWT_SECRET || 'e2e-secret-that-is-at-least-32-characters-long',
      BOOTSTRAP_ADMIN_EMAIL: 'e2e-admin@example.test',
      BOOTSTRAP_ADMIN_PASSWORD: 'e2e-password-12345',
    },
  },
});
