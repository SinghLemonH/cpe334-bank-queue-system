import { expect, test } from '@playwright/test';

/**
 * E2E-02 / TEST-18 / AC-18 (STS 2.5).
 * TEST-30 (operator call/start/complete) is added by F-03 in this same file.
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
