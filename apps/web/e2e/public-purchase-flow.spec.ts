import { test, expect, type APIRequestContext } from '@playwright/test';

const STORE_SLUG = process.env.E2E_STORE_SLUG || 'tienda-demo';
const PRODUCT_ID = process.env.E2E_PRODUCT_ID || 'cmogce3ds000jeqaeyvvnzapz';
const PRODUCT_NAME =
  process.env.E2E_PRODUCT_NAME || 'Kit Ring Light 26cm con Tripode 2m para Streaming';
const API_URL = process.env.API_URL || 'https://ecomerce-api-zulc.onrender.com/api';

async function warmApi(request: APIRequestContext) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const [health, store] = await Promise.all([
      request.get(`${API_URL}/health`).catch(() => null),
      request.get(`${API_URL}/stores/slug/${STORE_SLUG}`).catch(() => null),
    ]);

    if (health?.ok() && store?.ok()) return;
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

test.describe('Public purchase flow', () => {
  test('navigates store to product, adds to cart, and reaches checkout with order summary', async ({
    page,
    request,
  }) => {
    await warmApi(request);
    await page.goto(`/store/${STORE_SLUG}`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /productos/i })).toBeVisible({
      timeout: 20000,
    });

    const productLink = page.getByRole('link', { name: new RegExp(PRODUCT_NAME, 'i') }).first();
    await expect(productLink).toBeVisible({ timeout: 20000 });
    await productLink.click();

    await expect(page).toHaveURL(new RegExp(`/store/${STORE_SLUG}/${PRODUCT_ID}`));
    await expect(page.getByRole('heading', { name: PRODUCT_NAME })).toBeVisible({
      timeout: 20000,
    });

    const jsonLd = page.locator('script#product-jsonld');
    await expect(jsonLd).toHaveCount(1);
    const jsonLdPayload = JSON.parse((await jsonLd.textContent()) || '{}');
    expect(jsonLdPayload).toMatchObject({
      '@type': 'Product',
      name: PRODUCT_NAME,
    });

    await page.locator('#add-to-cart').click();
    await expect(page.locator('#add-to-cart')).toContainText(/added to cart/i);

    const cartSnapshot = await page.evaluate((slug) => {
      return window.sessionStorage.getItem(`cart_${slug}`);
    }, STORE_SLUG);

    expect(cartSnapshot).not.toBeNull();
    expect(JSON.parse(cartSnapshot || '[]')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: PRODUCT_ID,
          title: PRODUCT_NAME,
          quantity: 1,
        }),
      ])
    );

    await page.goto(`/store/${STORE_SLUG}`, { waitUntil: 'domcontentloaded' });
    const cartButton = page.getByTestId('store-cart-button');
    if ((await cartButton.count()) > 0) {
      await cartButton.click();
    } else {
      await page.locator('nav button').nth(2).click();
    }

    const checkoutLink = page.locator(`a[href*="/store/${STORE_SLUG}/checkout?items="]`).first();
    await expect(checkoutLink).toBeVisible({ timeout: 10000 });
    await checkoutLink.click();

    await expect(page).toHaveURL(new RegExp(`/store/${STORE_SLUG}/checkout\\?`));
    await expect(page.getByRole('heading', { name: 'Review Your Order' })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText(PRODUCT_NAME).first()).toBeVisible();
    await expect(page.getByText(/order summary/i)).toBeVisible();
    await expect(page.getByText(/total/i).last()).toBeVisible();

    await page.route('**/orders/validate-shipping', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ valid: true }),
      });
    });

    await page.getByRole('button', { name: /continue to shipping/i }).click();
    await expect(page.getByRole('heading', { name: 'Shipping Information' })).toBeVisible();

    await page.getByPlaceholder('John', { exact: true }).fill('Test');
    await page.getByPlaceholder('Doe', { exact: true }).fill('Customer');
    await page.getByPlaceholder('john@example.com', { exact: true }).fill('customer-test@ecomerce.com');
    await page.getByPlaceholder('Calle 123 #45-67', { exact: true }).fill('123 Test Street');
    await page.getByPlaceholder('Cali', { exact: true }).fill('Bogota');
    await page.getByPlaceholder('760001', { exact: true }).fill('110111');
    await page.getByPlaceholder('Valle del Cauca', { exact: true }).fill('Cundinamarca');
    await page.locator('select').first().selectOption('Colombia');

    await page.getByRole('button', { name: /continue to payment/i }).click();
    await expect(page.getByRole('heading', { name: 'Payment' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/secure payment powered by mercadopago/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /pay with mercadopago/i })).toBeVisible();
  });
});
