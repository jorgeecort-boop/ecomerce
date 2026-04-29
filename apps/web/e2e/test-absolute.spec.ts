import { test, expect } from '@playwright/test';

test('absolute URL test', async ({ page }) => {
  await page.goto('https://ecomerce-web.vercel.app/');
  await expect(page).toHaveTitle(/Ecomerce/);
});
