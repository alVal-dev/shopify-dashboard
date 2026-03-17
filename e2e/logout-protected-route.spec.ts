import { expect, test } from '@playwright/test';

test('logout redirects to login and protected route requires auth', async ({ page }) => {
  await page.goto('/login');

  await page.getByRole('button', { name: 'Explorer la démo' }).click();
  await page.waitForURL('**/dashboard');

  await expect(page.getByRole('button', { name: 'Déconnexion' })).toBeVisible();

  await page.getByRole('button', { name: 'Déconnexion' }).click();

  await page.waitForURL('**/login');
  await expect(page).toHaveURL(/\/login$/);

  await page.goto('/dashboard');

  await page.waitForURL(/\/login/);
  await expect(page).toHaveURL(/\/login\?redirect=\/dashboard/);
  await expect(page.getByRole('button', { name: 'Explorer la démo' })).toBeVisible();
});
