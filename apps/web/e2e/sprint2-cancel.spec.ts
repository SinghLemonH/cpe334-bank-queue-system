import { expect, test } from '@playwright/test';

/**
 * E2E-03 / TEST-36 / AC-36 (docs/sprints/sprint-2/sts.md 2.8).
 * Uses customer3 on queue O, which no other spec uses, and ends with no active ticket
 * (BR-02 v2 allows one active ticket per customer per day).
 */
const PASSWORD = process.env.SEED_DEMO_PASSWORD ?? 'demo_password_1234';

test('TEST-36 / AC-36: a customer cancels a ticket from /my-ticket and sees the cancelled card', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill('customer3');
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/queues$/);

  // 1. Join queue O and land on the ticket card
  await page.getByTestId('queue-O').getByRole('button', { name: 'Join' }).click();
  await expect(page).toHaveURL(/\/my-ticket$/);
  const ticket = page.getByTestId('ticket').last();
  await expect(ticket).toContainText('Your ticket number is');
  await expect(ticket).toContainText('Waiting');
  await expect(ticket).toContainText('People ahead:');
  const number = (await ticket.locator('p.text-6xl').innerText()).trim();
  expect(number).toMatch(/^O\d{3,}$/);

  // 2. Cancel and accept the confirm dialog
  page.once('dialog', (dialog) => {
    expect(dialog.message()).toBe(`Cancel ticket ${number}?`);
    void dialog.accept();
  });
  await page.getByRole('button', { name: 'Cancel ticket' }).click();

  // 3. The same card now shows the cancelled state and notice
  const cancelled = page.locator(`[data-testid="ticket"]:has-text("${number}")`);
  await expect(cancelled).toHaveAttribute('data-status', 'CANCELLED');
  await expect(cancelled).toContainText('Cancelled');
  await expect(cancelled).toContainText('This ticket was cancelled. You can take a new number.');
  await expect(page.getByRole('button', { name: 'Cancel ticket' })).toHaveCount(0);

  // 4. The customer may join again (no active ticket left)
  await page.goto('/queues');
  await expect(page.getByTestId('queue-O').getByRole('button', { name: 'Join' })).toBeEnabled();
});
