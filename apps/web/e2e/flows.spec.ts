import { test, expect } from '@playwright/test';

const shouldRunStoreE2E = process.env.CI === 'true' || process.env.RUN_STORE_E2E === 'true';

test.describe('Store Management Flow', () => {
  test('should show settings page requires auth', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await expect(page).toHaveURL('/login');
  });

  test('should show products page requires auth', async ({ page }) => {
    await page.goto('/dashboard/products');
    await expect(page).toHaveURL('/login');
  });

  test('should show orders page requires auth', async ({ page }) => {
    await page.goto('/dashboard/orders');
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Product Management Flow', () => {
  test('should show new product page requires auth', async ({ page }) => {
    await page.goto('/dashboard/products/new');
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Orders Management Flow', () => {
  test('should show orders page requires auth', async ({ page }) => {
    await page.goto('/dashboard/orders');
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Shopify Integration Flow', () => {
  test('should show shopify page requires auth', async ({ page }) => {
    await page.goto('/dashboard/shopify');
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Dashboard Overview Flow', () => {
  test('should show dashboard requires auth', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Checkout Flow', () => {
  test.skip(!shouldRunStoreE2E, 'Checkout route requires store API access; set RUN_STORE_E2E=true to run locally');

  test('should show checkout page exists', async ({ page }) => {
    await page.goto('/store/test-store/checkout');
    await expect(page).toHaveURL(/\/store\/.*\/checkout/);
  });
});

test.describe('Store Frontend Flow', () => {
  test.skip(!shouldRunStoreE2E, 'Store routes require API access; set RUN_STORE_E2E=true to run locally');

  test('should show store page', async ({ page }) => {
    await page.goto('/store/test-store');
    await expect(page).toHaveURL(/\/store\/test-store/);
  });

  test('should show product detail page', async ({ page }) => {
    await page.goto('/store/test-store/test-product');
    await expect(page).toHaveURL(/\/store\/test-store\/test-product/);
  });
});

test.describe('Password Reset Flow', () => {
  test('should show forgot password link on login', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('link', { name: /forgot/i })).toBeVisible();
  });

  test('should navigate to forgot password page', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /forgot/i }).click();
    await expect(page).toHaveURL('/forgot-password');
    await expect(page.getByText(/olvidaste tu contraseña/i)).toBeVisible();
  });

  test('should show forgot password form', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByPlaceholder('tu@email.com')).toBeVisible();
    await expect(page.getByRole('button', { name: /enviar instrucciones/i })).toBeVisible();
  });

  test('should show reset password page with token', async ({ page }) => {
    await page.goto('/reset-password?token=test-token-123');
    await expect(page.getByRole('heading', { name: /nueva contraseña/i })).toBeVisible();
    await expect(page.getByPlaceholder(/m.nimo 6 caracteres/i)).toBeVisible();
    await expect(page.getByPlaceholder(/repite la contraseña/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /restablecer contraseña/i })).toBeVisible();
  });
});

test.describe('Account Pages Auth', () => {
  test('should redirect unauthenticated users from account page to login', async ({ page }) => {
    await page.goto('/account');
    await expect(page).toHaveURL('/login');
  });

  test('should redirect unauthenticated users from account/orders to login', async ({ page }) => {
    await page.goto('/account/orders');
    await expect(page).toHaveURL('/login');
  });

  test('should redirect unauthenticated users from account/orders/:id to login', async ({ page }) => {
    await page.goto('/account/orders/some-order-id');
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Responsive Layout', () => {
  test('should render landing page on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page).toHaveTitle(/Ecomerce/);
    await expect(page.getByRole('heading', { name: /transforma tu setup/i })).toBeVisible();
  });

  test('should render login page on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');
    await expect(page.getByLabel('Email')).toBeVisible();
  });

  test('should render register page on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/register');
    await expect(page.getByLabel('Full Name')).toBeVisible();
  });
});

test.describe('Navigation Flow', () => {
  test('should navigate from landing to store', async ({ page }) => {
    test.skip(!shouldRunStoreE2E, 'Store route requires API access; set RUN_STORE_E2E=true to run locally');

    await page.goto('/');
    await page.getByRole('button', { name: /ver tienda/i }).click();
    await expect(page).toHaveURL(/\/store\/tienda-demo/);
  });

  test('should navigate from landing CTA to products section', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /explorar tienda/i }).click();
    await expect(page.locator('#productos')).toBeInViewport();
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
});

test.describe('Error Pages', () => {
  test('should show 404 for non-existent route', async ({ page }) => {
    await page.goto('/non-existent-route');
    const status = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1?.textContent?.includes('404') || h1?.textContent?.includes('Not Found');
    });
    expect(status || page.url().includes('_not-found')).toBe(true);
  });

  test('should show 404 for non-existent store', async ({ page }) => {
    test.skip(!shouldRunStoreE2E, 'Store route requires API access; set RUN_STORE_E2E=true to run locally');

    await page.goto('/store/non-existent-store-xyz');
    await expect(
      page.getByRole('heading', { name: /tienda no encontrada|la tienda se esta despertando/i })
    ).toBeVisible();
  });
});

test.describe('API Health Check', () => {
  test('should return healthy API response when available', async ({ request }) => {
    test.skip(process.env.CI !== 'true', 'API not available locally');
    const response = await request.get('http://localhost:3001/api/health');
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.status).toBe('ok');
  });
});
