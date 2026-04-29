import { test, expect } from '@playwright/test';
import { AuthenticatedHelpers } from './authenticated-helpers';

test.describe('Authenticated Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as customer - assuming test customer user exists
    await AuthenticatedHelpers.loginAsCustomer(page);
  });

  test.afterEach(async () => {
    // No cleanup needed for now - tests should be idempotent or use existing data
  });

  test('should add product to cart and proceed to checkout', async ({ page }) => {
    // Navigate to a store (we'll use the demo store or create one via API)
    // For this test, we'll assume there's a store with products available
    await page.goto('/store/tienda-demo');
    await expect(page).toHaveURL(/\/store\/tienda-demo/);

    // Wait for products to load
    await expect(page.getByText(/product/i).first()).toBeVisible({ timeout: 10000 });

    // Add first product to cart
    await page
      .getByRole('button', { name: /add to cart/i })
      .first()
      .click();

    // Verify cart updated
    await expect(page.getByText(/1 item/i)).toBeVisible();

    // Navigate to cart
    await page.getByRole('link', { name: /cart/i }).click();
    await expect(page).toHaveURL(/\/cart/);

    // Proceed to checkout
    await page.getByRole('button', { name: /proceed to checkout/i }).click();
    await expect(page).toHaveURL(/\/checkout/);
  });

  test('should complete checkout with shipping information', async ({ page }) => {
    // First add a product to cart
    await page.goto('/store/tienda-demo');
    await page
      .getByRole('button', { name: /add to cart/i })
      .first()
      .click();
    await page.getByRole('link', { name: /cart/i }).click();
    await page.getByRole('button', { name: /proceed to checkout/i }).click();

    // Fill shipping information
    await page.getByLabel('Full Name').fill('Test Customer');
    await page.getByLabel('Email').fill('customer-test@ecomerce.com');
    await page.getByLabel('Phone').fill('+1234567890');
    await page.getByLabel('Address Line 1').fill('123 Test Street');
    await page.getByLabel('Address Line 2').fill('Apt 4B');
    await page.getByLabel('City').fill('Test City');
    await page.getByLabel('State/Province').fill('Test State');
    await page.getByLabel('Postal Code').fill('12345');
    await page.getByLabel('Country').selectOption('United States');

    // Continue to payment
    await page.getByRole('button', { name: /continue to payment/i }).click();

    // Verify we're on payment page
    await expect(page).toHaveURL(/\/checkout\/payment/);
  });

  test('should show validation errors for incomplete shipping form', async ({ page }) => {
    // First add a product to cart
    await page.goto('/store/tienda-demo');
    await page
      .getByRole('button', { name: /add to cart/i })
      .first()
      .click();
    await page.getByRole('link', { name: /cart/i }).click();
    await page.getByRole('button', { name: /proceed to checkout/i }).click();

    // Submit empty shipping form
    await page.getByRole('button', { name: /continue to payment/i }).click();

    // Check for validation errors
    await expect(page.getByText(/full name is required/i)).toBeVisible();
    await expect(page.getByText(/email is required/i)).toBeVisible();
    await expect(page.getByText(/address is required/i)).toBeVisible();
    await expect(page.getByText(/city is required/i)).toBeVisible();
    await expect(page.getByText(/postal code is required/i)).toBeVisible();
  });

  test('should complete checkout with MercadoPago payment (mocked)', async ({ page }) => {
    // Add product to cart
    await page.goto('/store/tienda-demo');
    await page
      .getByRole('button', { name: /add to cart/i })
      .first()
      .click();
    await page.getByRole('link', { name: /cart/i }).click();
    await page.getByRole('button', { name: /proceed to checkout/i }).click();

    // Fill shipping information
    await page.getByLabel('Full Name').fill('Test Customer');
    await page.getByLabel('Email').fill('customer-test@ecomerce.com');
    await page.getByLabel('Phone').fill('+1234567890');
    await page.getByLabel('Address Line 1').fill('123 Test Street');
    await page.getByLabel('City').fill('Test City');
    await page.getByLabel('State/Province').fill('Test State');
    await page.getByLabel('Postal Code').fill('12345');
    await page.getByLabel('Country').selectOption('United States');

    // Continue to payment
    await page.getByRole('button', { name: /continue to payment/i }).click();

    // Select MercadoPago as payment method
    await page.getByLabel('MercadoPago').check();

    // Complete payment (in a real test, we might mock the MercadoPago redirect)
    await page.getByRole('button', { name: /pay now/i }).click();

    // Wait for success page
    await expect(page.getByText(/order placed successfully/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/thank you for your purchase/i)).toBeVisible();

    // Verify order number is displayed
    await expect(page.getByText(/order #/i)).toBeVisible();
  });

  test('should show order in customer history after checkout', async ({ page }) => {
    // Complete a checkout first
    await page.goto('/store/tienda-demo');
    await page
      .getByRole('button', { name: /add to cart/i })
      .first()
      .click();
    await page.getByRole('link', { name: /cart/i }).click();
    await page.getByRole('button', { name: /proceed to checkout/i }).click();

    // Fill shipping information
    await page.getByLabel('Full Name').fill('Test Customer');
    await page.getByLabel('Email').fill('customer-test@ecomerce.com');
    await page.getByLabel('Phone').fill('+1234567890');
    await page.getByLabel('Address Line 1').fill('123 Test Street');
    await page.getByLabel('City').fill('Test City');
    await page.getByLabel('State/Province').fill('Test State');
    await page.getByLabel('Postal Code').fill('12345');
    await page.getByLabel('Country').selectOption('United States');

    // Continue to payment and complete
    await page.getByRole('button', { name: /continue to payment/i }).click();
    await page.getByLabel('MercadoPago').check();
    await page.getByRole('button', { name: /pay now/i }).click();

    // Wait for success
    await expect(page.getByText(/order placed successfully/i)).toBeVisible({ timeout: 15000 });

    // Navigate to order history
    await page.getByRole('link', { name: /my orders/i }).click();
    await expect(page).toHaveURL(/\/orders/);

    // Verify recent order appears in history
    // Note: This would depend on the actual implementation showing recent orders
    await expect(page.getByText(/order #/i)).toBeVisible();
  });
});
