import { expect, test } from '@playwright/test';

/**
 * E2E-02 / TEST-18 / AC-18 (STS 2.5).
 * TEST-30 (operator call/start/complete) follows in this same file (F-03).
 * Preconditions: dev DB migrated and seeded, queues empty and open.
 */
const PASSWORD = process.env.SEED_DEMO_PASSWORD ?? 'demo_password_1234';

test('TEST-18 / AC-18: customer joins from the queue list and a second join explains the duplicate', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill('customer1');
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/queues$/);

  const deposit = page.getByTestId('queue-D');
  await expect(deposit).toContainText('Deposit & Withdrawal');
  await expect(deposit).toContainText('Open');
  await deposit.getByRole('button', { name: 'Join' }).click();

  await expect(page).toHaveURL(/\/my-ticket$/);
  const ticket = page.getByTestId('ticket');
  await expect(ticket).toContainText('D001');
  await expect(ticket).toContainText('Waiting');
  await expect(ticket).toContainText('People ahead: 0');

  await page.goto('/queues');
  await page.getByTestId('queue-D').getByRole('button', { name: 'Join' }).click();
  const duplicate = page.getByTestId('join-error-D');
  await expect(duplicate).toContainText('You already have an active ticket in this queue today.');
  await expect(duplicate).toContainText('คุณมีบัตรคิวที่ยังใช้งานอยู่ในคิวนี้แล้ววันนี้');
  await expect(page.getByRole('link', { name: 'View my ticket' })).toBeVisible();
});

/**
 * E2E-02 / TEST-30 / AC-30 (+ AC-25 UI). Continues TEST-18: customer1 holds D001 WAITING.
 * The operator works in this test's own browser context; customer1 checks in a second one.
 */
test('TEST-30 / AC-30: operator calls, starts and completes D001 and the page restores it after reload', async ({
  page,
  browser,
}) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill('teller1');
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/operator$/);

  // 1. Assigned queue with its waiting count
  const deposit = page.getByTestId('desk-queue-D');
  await expect(deposit).toContainText('Deposit & Withdrawal');
  await expect(deposit).toContainText('1 waiting');
  await expect(page.getByTestId('desk-queue-L')).toHaveCount(0);

  // 2. Call next -> D001 CALLED with Start
  await deposit.getByRole('button', { name: 'Call next' }).click();
  const card = page.getByTestId('current-entry');
  await expect(card).toContainText('D001');
  await expect(card).toContainText('Called');
  await expect(card.getByRole('button', { name: 'Start' })).toBeVisible();
  await expect(deposit.getByRole('button', { name: 'Call next' })).toBeDisabled();

  // 3. Reload restores the held entry (D-21)
  await page.reload();
  await expect(card).toContainText('D001');
  await expect(card.getByRole('button', { name: 'Start' })).toBeVisible();

  // 4. Start -> Complete
  await card.getByRole('button', { name: 'Start' }).click();
  await expect(card).toContainText('Being served');
  await expect(card.getByRole('button', { name: 'Complete' })).toBeVisible();

  // 5. Complete -> card empties
  await card.getByRole('button', { name: 'Complete' }).click();
  await expect(card).toContainText('You are not serving anyone. Press Call next.');
  await expect(deposit).toContainText('0 waiting');

  // 6. customer1 sees Completed on /my-ticket
  const customerContext = await browser.newContext();
  const customer = await customerContext.newPage();
  await customer.goto('/login');
  await customer.getByLabel('Username').fill('customer1');
  await customer.getByLabel('Password').fill(PASSWORD);
  await customer.getByRole('button', { name: 'Sign in' }).click();
  await expect(customer).toHaveURL(/\/queues$/);
  await customer.goto('/my-ticket');
  await expect(customer.getByTestId('ticket')).toContainText('Completed', { timeout: 6_000 });
  await customerContext.close();
});
