import { expect, test } from '@playwright/test';

test('orders CSV export downloads from the UI', async ({ page }) => {
  await page.goto('/login');

  await page.getByRole('button', { name: 'Explorer la démo' }).click();
  await page.waitForURL('**/dashboard');

  await expect(page.getByRole('button', { name: 'Exporter CSV' })).toBeVisible();

  const downloadPromise = page.waitForEvent('download');

  await page.getByRole('button', { name: 'Exporter CSV' }).click();

  const download = await downloadPromise;

  const suggestedFilename = download.suggestedFilename();
  expect(suggestedFilename).toMatch(/^orders-\d{4}-\d{2}-\d{2}\.csv$/);

  const path = await download.path();
  expect(path).toBeTruthy();
});
