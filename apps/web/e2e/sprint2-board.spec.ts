import { expect, test } from '@playwright/test';

/**
 * E2E-04 / TEST-49 / AC-49 (docs/sprints/sprint-2/sts.md 2.8).
 * Uses customer2 and teller2 on queue D (distinct from sprint1-journey and sprint2-cancel)
 * and cleans up by starting and completing the entry so no active ticket or held entry remains.
 */
const PASSWORD = process.env.SEED_DEMO_PASSWORD ?? 'demo_password_1234';

test('TEST-49 / AC-49: operator selects Counter 2, calls next, and anonymous /board shows it', async ({
  page,
  browser,
}) => {
  // 1. Customer (customer2) joins queue D
  const customerContext = await browser.newContext();
  const customerPage = await customerContext.newPage();
  await customerPage.goto('/login');
  await customerPage.getByLabel('Username').fill('customer2');
  await customerPage.getByLabel('Password').fill(PASSWORD);
  await customerPage.getByRole('button', { name: 'Sign in' }).click();
  await expect(customerPage).toHaveURL(/\/queues$/);

  await customerPage.getByTestId('queue-D').getByRole('button', { name: 'Join' }).click();
  await expect(customerPage).toHaveURL(/\/my-ticket$/);
  const ticket = customerPage.getByTestId('ticket').last();
  const displayNumber = (await ticket.locator('p.text-6xl').innerText()).trim();
  expect(displayNumber).toMatch(/^D\d{3,}$/);
  await customerContext.close();

  // 2. Operator (teller2) selects Counter 2 and calls next
  await page.goto('/login');
  await page.getByLabel('Username').fill('teller2');
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/operator$/);

  const deposit = page.getByTestId('desk-queue-D');
  const select = deposit.getByTestId('counter-select-D');
  await expect(select).toBeEnabled();
  await select.selectOption({ label: 'Counter 2' });
  await deposit.getByRole('button', { name: 'Call next' }).click();

  const card = page.getByTestId('current-entry');
  await expect(card).toContainText(displayNumber);
  await expect(card).toContainText('Counter 2');

  // 3. Anonymous browser context opens /board and sees the number + Counter 2 within 6s
  const boardContext = await browser.newContext();
  const boardPage = await boardContext.newPage();
  await boardPage.goto('/board');
  const boardCol = boardPage.getByTestId('board-queue-D');
  await expect(boardCol).toContainText(displayNumber, { timeout: 6_000 });
  await expect(boardCol).toContainText('Counter 2', { timeout: 6_000 });
  await boardContext.close();

  // 4. Cleanup: start and complete so no active ticket or held entry remains
  await card.getByRole('button', { name: 'Start' }).click();
  await expect(card).toContainText('Being served');
  await card.getByRole('button', { name: 'Complete' }).click();
  await expect(card).toContainText('You are not serving anyone. Press Call next.');
});
