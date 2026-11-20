import { expect, Page, test } from '@playwright/test';

/**
 * Lab 6 UAT regression tests for defects reported by the partner UAT team.
 * - Issue #39 (BUG-001): the password visibility toggle must be a touch target of at least 40px (UI spec §7).
 * - Issue #40 (BUG-002): signed-in pages must not scroll horizontally on a 375px phone (UI spec §7).
 *   A desktop browser at 375px has a classic vertical scrollbar of about 15px, which leaves about 360px
 *   of layout width, so the header is checked at 360px as well as at 375px.
 */
const PASSWORD = process.env.SEED_DEMO_PASSWORD ?? 'demo_password_1234';
const MIN_TOUCH_TARGET = 40;

async function signIn(page: Page, username: string) {
  await page.goto('/login');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const logout = [...document.querySelectorAll('header button')].find((b) =>
      /Logout|Signing out/.test((b as HTMLElement).innerText),
    );
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      logoutRight: logout ? Math.ceil(logout.getBoundingClientRect().right) : null,
    };
  });
}

test('BUG-39 / issue #39: password visibility toggle is at least 40x40 px in both states (UI spec §7)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/login');

  const toggle = page.locator('button[aria-controls="password"]');
  await expect(toggle).toHaveAttribute('aria-label', 'Show characters');
  let box = await toggle.boundingBox();
  expect(box, 'toggle is rendered').not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
  expect(box!.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-label', 'Hide characters');
  await expect(page.locator('#password')).toHaveAttribute('type', 'text');
  box = await toggle.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
  expect(box!.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
});

for (const width of [360, 375]) {
  for (const { user, path } of [
    { user: 'customer1', path: '/my-ticket' },
    { user: 'customer1', path: '/queues' },
    { user: 'teller1', path: '/operator' },
  ]) {
    test(`BUG-40 / issue #40: ${path} as ${user} has no horizontal scroll and Logout is fully visible at ${width}px (UI spec §7)`, async ({ page }) => {
      await signIn(page, user);
      await expect(page.getByTestId('current-user')).toBeVisible();
      await page.setViewportSize({ width, height: 812 });
      await page.goto(path);
      await expect(page.getByTestId('current-user')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();

      const m = await horizontalOverflow(page);
      expect(m.scrollWidth, `page scrollWidth ${m.scrollWidth} must not exceed clientWidth ${m.clientWidth}`).toBeLessThanOrEqual(m.clientWidth);
      expect(m.logoutRight, 'Logout right edge must be inside the viewport').not.toBeNull();
      expect(m.logoutRight!).toBeLessThanOrEqual(m.clientWidth);
    });
  }
}
