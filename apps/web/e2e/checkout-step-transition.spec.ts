import { test, expect } from '@playwright/test';

const shouldRunStoreE2E = process.env.CI === 'true' || process.env.RUN_STORE_E2E === 'true';

test.describe('Checkout Step Transition', () => {
  test.skip(!shouldRunStoreE2E, 'Checkout route requires store API access; set RUN_STORE_E2E=true to run locally');

  test('moves from Shipping (step 2) to Payment (step 3)', async ({ page }) => {
    await page.route('**/stores/slug/test-store', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'store_test_1',
          name: 'Test Store',
          slug: 'test-store',
          products: [
            {
              id: 'prod_1',
              title: 'Wireless Earbuds',
              description: 'Noise cancelling earbuds',
              price: 49.99,
              inventory: 12,
              isPublished: true,
            },
          ],
        }),
      });
    });

        // General intercept for validate-shipping
    await page.route('**/validate-shipping*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ valid: true }),
      });
    });

    // Make sure API_URL points to the local backend during tests
    await page.route('http://localhost:3001/api/orders/validate-shipping', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ valid: true }),
      });
    });

    await page.goto('/store/test-store');
    await page.locator('#add-to-cart-prod_1').click();
    await page.locator('#cart-button').click();
    await page.locator('#checkout-btn').click();

    await expect(page).toHaveURL(/\/store\/test-store\/checkout\?/);
    await expect(page.getByRole('heading', { name: 'Review Your Order' })).toBeVisible();

    await page.getByRole('button', { name: /continue to shipping/i }).click();
    await expect(page.getByRole('heading', { name: 'Shipping Information' })).toBeVisible();

    await page.getByPlaceholder('John', { exact: true }).fill('Test');
    await page.getByPlaceholder('Doe', { exact: true }).fill('Customer');
    await page.getByPlaceholder('john@example.com', { exact: true }).fill('customer-test@ecomerce.com');
    await page.getByPlaceholder('Calle 123 #45-67', { exact: true }).fill('123 Test Street');
    await page.getByPlaceholder('Cali', { exact: true }).fill('Bogota');
    await page.getByPlaceholder('760001', { exact: true }).fill('110111');
    await page.locator('select').first().selectOption('Colombia');

                await page.getByRole('button', { name: /continue to payment/i }).click({ force: true });

                // Small explicit wait to ensure the network request has time to trigger and state to update
                await page.waitForTimeout(1000);

                // The heading is 'Payment' so it should match exactly
                await expect(page.getByRole('heading', { name: 'Payment' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/secure payment powered by mercadopago/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /pay with mercadopago/i })).toBeVisible();
  });
});
