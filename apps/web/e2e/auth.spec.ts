import { expect, Page, test } from '@playwright/test';

/**
 * E2E-01 = TEST-08 / AC-08 (STS 2.5). Uses the demo seed accounts.
 * The password is the synthetic SEED_DEMO_PASSWORD used when seeding.
 */
const PASSWORD = process.env.SEED_DEMO_PASSWORD ?? 'demo_password_1234';

async function signIn(page: Page, username: string) {
  await page.goto('/login');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

async function signOut(page: Page) {
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/login$/);
}

test('TEST-08 / AC-08: anonymous redirect, role-based landing and logout (E2E-01)', async ({ page, context }) => {
  // 1-2. Anonymous visits are redirected to /login
  await page.goto('/queues');
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/operator');
  await expect(page).toHaveURL(/\/login$/);

  // 3. Customer lands on /queues with their name in the header
  await signIn(page, 'customer1');
  await expect(page).toHaveURL(/\/queues$/);
  await expect(page.getByTestId('current-user')).toContainText('CUSTOMER');
  const sid = (await context.cookies()).find((c) => c.name === 'sid');
  expect(sid?.httpOnly).toBe(true);
  expect(sid?.sameSite).toBe('Lax');

  // 4. Logout returns to /login and the session cookie is gone
  await signOut(page);
  expect((await context.cookies()).find((c) => c.name === 'sid')).toBeUndefined();
  await page.goto('/queues');
  await expect(page).toHaveURL(/\/login$/);

  // 5. Operator lands on /operator
  await signIn(page, 'teller1');
  await expect(page).toHaveURL(/\/operator$/);
  await expect(page.getByTestId('current-user')).toContainText('OPERATOR');

  // 6. Logout again
  await signOut(page);
});

test('TEST-08 / AC-08: wrong password shows a friendly message and stays on /login', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill('customer1');
  await page.getByLabel('Password').fill('not-the-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  // Next.js also renders a hidden role="alert" route announcer, so target the login error box.
  await expect(page.getByTestId('login-error')).toContainText('Invalid username or password.');
  await expect(page.getByTestId('login-error')).toContainText('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  await expect(page).toHaveURL(/\/login$/);
});
