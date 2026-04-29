import { test, expect } from '@playwright/test';

test('debug baseURL', async ({ page }) => {
  await page.goto('/');
  console.log('Current URL after goto:/', page.url());

  await page.goto('/login');
  console.log('Current URL after goto:/login', page.url());
});
