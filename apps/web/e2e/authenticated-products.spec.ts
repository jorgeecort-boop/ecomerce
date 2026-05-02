import { test, expect } from '@playwright/test';
import { AuthenticatedHelpers } from './authenticated-helpers';

// TODO: unskip once test users (vendor-test@ecomerce.com / customer-test@ecomerce.com)
// are seeded in the target DB. Tracked: implement gated POST /api/test/create-user
// endpoint enabled only when NODE_ENV !== 'production' OR when E2E_SEED_TOKEN matches.
// See AuthenticatedHelpers.createTestVendor for the expected contract.
test.describe.skip('Authenticated Product Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as vendor - assuming test vendor user exists
    await AuthenticatedHelpers.loginAsVendor(page);
  });

  test.afterEach(async () => {
    // No cleanup needed for now - tests should be idempotent or use existing data
  });

  test('should navigate to products management page', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard\/?.*/);

    // Click on "Manage Products" or navigate to products
    await page.getByRole('link', { name: /products/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/products/);
  });

  test('should create a new product successfully', async ({ page }) => {
    // First, we need a store to associate the product with
    // For simplicity, we'll assume there's a default store or create one via API
    // In a real scenario, we might need to create a store first

    // Navigate to new product page
    await page.goto('/dashboard/products/new');
    await expect(page).toHaveURL(/\/dashboard\/products\/new/);

    // Fill product form
    await page.getByLabel('Product Name').fill('Test Product E2E');
    await page
      .getByLabel('Product Description')
      .fill('This is a test product created by E2E tests');
    await page.getByLabel('Price').fill('29.99');
    await page.getByLabel('Inventory Quantity').fill('100');
    await page.getByLabel('Category').selectOption('electronics');

    // Submit the form
    await page.getByRole('button', { name: /create product/i }).click();

    // Wait for success message
    await expect(page.getByText(/product created successfully/i)).toBeVisible({ timeout: 10000 });

    // Verify we can see the product in the list
    await page.goto('/dashboard/products');
    await expect(page.getByText('Test Product E2E')).toBeVisible();
  });

  test('should show validation errors for incomplete product form', async ({ page }) => {
    // Navigate to new product form
    await page.goto('/dashboard/products/new');
    await expect(page).toHaveURL(/\/dashboard\/products\/new/);

    // Submit empty form
    await page.getByRole('button', { name: /create product/i }).click();

    // Check for validation errors
    await expect(page.getByText(/product name is required/i)).toBeVisible();
    await expect(page.getByText(/price is required/i)).toBeVisible();
    await expect(page.getByText(/inventory quantity is required/i)).toBeVisible();
  });

  test('should be able to edit product details', async ({ page }) => {
    // First create a product
    await page.goto('/dashboard/products/new');
    await page.getByLabel('Product Name').fill('Product To Edit');
    await page.getByLabel('Product Description').fill('Initial description');
    await page.getByLabel('Price').fill('15.50');
    await page.getByLabel('Inventory Quantity').fill('50');
    await page.getByLabel('Category').selectOption('books');
    await page.getByRole('button', { name: /create product/i }).click();

    // Wait for creation success
    await expect(page.getByText(/product created successfully/i)).toBeVisible({ timeout: 10000 });

    // Navigate to products list and edit the product
    await page.goto('/dashboard/products');
    await page.getByText('Product To Edit').click();
    await expect(page).toHaveURL(/\/dashboard\/products\/.*\/edit/);

    // Edit product details
    await page.getByLabel('Product Description').clear();
    await page.getByLabel('Product Description').fill('Updated description for E2E test');
    await page.getByLabel('Price').clear();
    await page.getByLabel('Price').fill('25.99');
    await page.getByLabel('Category').selectOption('electronics');

    // Save changes
    await page.getByRole('button', { name: /save changes/i }).click();

    // Verify update success
    await expect(page.getByText(/product updated successfully/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Updated description for E2E test')).toBeVisible();
    await expect(page.getByLabel('Price')).toHaveValue('25.99');
  });

  test('should be able to delete a product', async ({ page }) => {
    // First create a product
    await page.goto('/dashboard/products/new');
    await page.getByLabel('Product Name').fill('Product To Delete');
    await page.getByLabel('Product Description').fill('This product will be deleted');
    await page.getByLabel('Price').fill('10.00');
    await page.getByLabel('Inventory Quantity').fill('25');
    await page.getByLabel('Category').selectOption('clothing');
    await page.getByRole('button', { name: /create product/i }).click();

    // Wait for creation success
    await expect(page.getByText(/product created successfully/i)).toBeVisible({ timeout: 10000 });

    // Navigate to products list and delete the product
    await page.goto('/dashboard/products');
    await page.getByText('Product To Delete').click();
    await expect(page).toHaveURL(/\/dashboard\/products\/.*\/edit/);

    // Click delete button (usually with confirmation)
    await page.getByRole('button', { name: /delete/i }).click();

    // Handle confirmation dialog if present
    const dialogPromise = page.waitForEvent('dialog');
    await page.getByRole('button', { name: /confirm|yes|delete/i }).click();
    const dialog = await dialogPromise;
    expect(dialog.message()).toContain('delete');
    await dialog.accept();

    // Verify deletion success
    await expect(page.getByText(/product deleted successfully/i)).toBeVisible({ timeout: 10000 });

    // Verify product is no longer in the list
    await page.goto('/dashboard/products');
    await expect(page.getByText('Product To Delete')).not.toBeVisible();
  });
});
