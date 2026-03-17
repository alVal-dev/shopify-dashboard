import { expect, test } from '@playwright/test';

test('login demo redirects to dashboard', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('heading', { name: 'Shopify Analytics' })).toBeVisible();

  await page.getByRole('button', { name: 'Explorer la démo' }).click();

  await page.waitForURL('**/dashboard');

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('button', { name: 'Déconnexion' })).toBeVisible();
  await expect(
    page.getByText('Mode démo : données fictives, réinitialisées régulièrement.'),
  ).toBeVisible();
});
