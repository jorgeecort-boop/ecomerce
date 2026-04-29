import { test, expect } from '@playwright/test';

const BASE_URL = 'https://ecomerce-web.vercel.app';

test('explicit URL test', async ({ page }) => {
  await page.goto(`${BASE_URL}/`);
  await expect(page).toHaveTitle(/Ecomerce/);

  await page.goto(`${BASE_URL}/login`);
  await expect(page).toHaveURL(`${BASE_URL}/login`);
  await expect(page.getByLabel('Email')).toBeVisible();
});
