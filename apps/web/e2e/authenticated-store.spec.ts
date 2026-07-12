import { test, expect } from '@playwright/test';
import { AuthenticatedHelpers } from './authenticated-helpers';

test.describe('Authenticated Store Creation Flow', () => {
  test.skip(!process.env.E2E_SEED_TOKEN, 'E2E_SEED_TOKEN is required for authenticated production flows');

  test.beforeEach(async ({ page }) => {
    // Login as vendor - assuming test vendor user exists
    await AuthenticatedHelpers.loginAsVendor(page);
  });

  test.afterEach(async () => {
    // No cleanup needed for now - tests should be idempotent or use existing data
  });

  test('should navigate to store creation page', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard\/?.*/);

    // Click on "Create New Store" button
    await page.getByRole('button', { name: /create new store/i }).click();
    await expect(page).toHaveURL(/\/stores\/new/);
  });

  test('should create a new store successfully', async ({ page }) => {
    // Navigate to store creation form
    await page.goto('/stores/new');
    await expect(page).toHaveURL(/\/stores\/new/);

    // Fill store creation form
    await page.getByLabel('Store Name').fill('Test Store E2E');
    await page.getByLabel('Store Description').fill('This is a test store created by E2E tests');
    await page.getByLabel('Store Category').selectOption('electronics');
    await page.getByLabel('Store Email').fill('teststore@example.com');
    await page.getByLabel('Store Phone').fill('+1234567890');

    // Submit the form
    await page.getByRole('button', { name: /create store/i }).click();

    // Wait for redirect to store dashboard or success message
    await expect(page.getByText(/store created successfully/i)).toBeVisible({ timeout: 10000 });

    // Verify we can see the store in the list
    await page.goto('/dashboard/stores');
    await expect(page.getByText('Test Store E2E')).toBeVisible();
  });

  test('should show validation errors for incomplete store form', async ({ page }) => {
    // Navigate to store creation form
    await page.goto('/stores/new');
    await expect(page).toHaveURL(/\/stores\/new/);

    // Submit empty form
    await page.getByRole('button', { name: /create store/i }).click();

    // Check for validation errors (look for error messages near fields)
    await expect(page.getByText(/store name is required/i)).toBeVisible();
    await expect(page.getByText(/store description is required/i)).toBeVisible();
    await expect(page.getByText(/store category is required/i)).toBeVisible();
  });

  test('should be able to edit store details', async ({ page }) => {
    // First create a store
    await page.goto('/stores/new');
    await page.getByLabel('Store Name').fill('Store To Edit');
    await page.getByLabel('Store Description').fill('Initial description');
    await page.getByLabel('Store Category').selectOption('clothing');
    await page.getByRole('button', { name: /create store/i }).click();

    // Wait for creation success
    await expect(page.getByText(/store created successfully/i)).toBeVisible({ timeout: 10000 });

    // Navigate to stores list and edit the store
    await page.goto('/dashboard/stores');
    await page.getByText('Store To Edit').click();
    await expect(page).toHaveURL(/\/stores\/.*\/edit/);

    // Edit store details
    await page.getByLabel('Store Description').clear();
    await page.getByLabel('Store Description').fill('Updated description for E2E test');
    await page.getByLabel('Store Category').selectOption('electronics');

    // Save changes
    await page.getByRole('button', { name: /save changes/i }).click();

    // Verify update success
    await expect(page.getByText(/store updated successfully/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Updated description for E2E test')).toBeVisible();
  });
});
