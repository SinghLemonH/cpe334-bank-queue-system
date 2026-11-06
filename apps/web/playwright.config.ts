import { defineConfig, devices } from '@playwright/test';

/**
 * E2E tests (STS 2.5). Preconditions: dev DB up, migrated and seeded with
 * SEED_DEMO_PASSWORD (see the README / test runner). Playwright starts the API (3001)
 * and the web app (3000) itself unless they are already running.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm run start --prefix ../api',
      url: 'http://localhost:3001/api/health',
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:3000/login',
      reuseExistingServer: true,
      timeout: 180_000,
      env: { API_BASE_URL: process.env.API_BASE_URL ?? 'http://localhost:3001' },
    },
  ],
});
