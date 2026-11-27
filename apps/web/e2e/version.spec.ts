import { expect, test } from '@playwright/test';

/**
 * Lab 5 R-08: every page shows which release is running, taken from GET /api/version.
 * Locally and in CI there is no GIT_SHA, so the API reports commit "local";
 * on Cloud Run the footer shows the first 7 characters of the deployed commit SHA.
 */
test('footer shows the running release on the public login page', async ({ page, request }) => {
  const res = await request.get('/api/version');
  expect(res.status()).toBe(200);
  const { version, commit } = (await res.json()) as { version: string; commit: string };
  expect(version).toBe('0.4.0-sprint2');

  await page.goto('/login');
  const footer = page.getByTestId('app-version');
  await expect(footer).toBeVisible();
  await expect(footer).toContainText(`v${version}`);
  await expect(footer).toContainText(/^[0-9a-f]{40}$/.test(commit) ? commit.slice(0, 7) : commit);
  await expect(footer).toHaveAttribute('title', `commit ${commit}`);
});
