import { test, expect } from '@playwright/test';

const shouldRunStoreE2E = process.env.CI === 'true' || process.env.RUN_STORE_E2E === 'true';

test.describe('Landing Page', () => {
  test('should load the landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Ecomerce/);
    await expect(page.getByRole('link', { name: 'SarahBits' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /transforma tu setup/i })).toBeVisible();
  });

  test('should have navigation links', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /productos/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /ofertas/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /ver tienda/i })).toBeVisible();
  });
});

test.describe('Authentication', () => {
  test('should show login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /ecomerce/i })).toBeVisible();
    await expect(page.getByText(/sign in to your account/i)).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should show register form', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /ecomerce/i })).toBeVisible();
    await expect(page.getByText(/create your account/i)).toBeVisible();
    await expect(page.getByLabel('Full Name')).toBeVisible();
    await expect(page.getByLabel('Email Address')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });

  test('should navigate from login to register', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /sign up/i }).click();
    await expect(page).toHaveURL('/register');
  });

  test('should navigate from register to login', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('link', { name: /sign in/i }).click();
    await expect(page).toHaveURL('/login');
  });

  test('should show error for invalid email on login', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByLabel('Email')).toBeVisible();
  });
});

test.describe('Dashboard', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });

  test('should redirect unauthenticated users from dashboard/products', async ({ page }) => {
    await page.goto('/dashboard/products');
    await expect(page).toHaveURL('/login');
  });

  test('should redirect unauthenticated users from dashboard/orders', async ({ page }) => {
    await page.goto('/dashboard/orders');
    await expect(page).toHaveURL('/login');
  });

  test('should redirect unauthenticated users from dashboard/settings', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Store Front', () => {
  test.skip(!shouldRunStoreE2E, 'Store routes require API access; set RUN_STORE_E2E=true to run locally');

  test('should show 404 for non-existent store', async ({ page }) => {
    await page.goto('/store/non-existent-store');
    await expect(
      page.getByRole('heading', { name: /tienda no encontrada|la tienda se esta despertando/i })
    ).toBeVisible();
  });
});
