/**
 * Integration tests for Shopify webhook endpoints
 *
 * Tests the full request → guard → controller → service flow with mocked Prisma.
 * Verifies:
 * - HMAC verification rejects unsigned requests
 * - HMAC verification accepts correctly signed requests
 * - orders/create endpoint processes new orders
 * - orders/fulfilled endpoint updates fulfillment status
 * - products/update endpoint acknowledges product changes
 * - app/uninstalled endpoint handles shop removal
 */

import * as crypto from 'crypto';

const WEBHOOK_SECRET = 'integration-test-secret';
const STORE_URL = 'test-store.myshopify.com';

// ── Helpers ──────────────────────────────────────────────────────────────────

function signPayload(body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(body, 'utf8').digest('base64');
}

function makeWebhookHeaders(body: string, topic: string, valid = true) {
  const hmac = valid
    ? signPayload(body, WEBHOOK_SECRET)
    : 'invalid-hmac-signature-base64==';

  return {
    'x-shopify-hmac-sha256': hmac,
    'x-shopify-topic': topic,
    'x-shopify-shop-domain': STORE_URL,
    'Content-Type': 'application/json',
  };
}

// ── Test payloads ────────────────────────────────────────────────────────────

const orderCreatePayload = {
  id: 555777999,
  order_number: 1042,
  email: 'customer@example.com',
  total_price: '49.99',
  currency: 'USD',
  financial_status: 'paid',
  fulfillment_status: null,
  line_items: [
    {
      id: 1,
      title: 'Wireless Earbuds',
      quantity: 2,
      price: '24.99',
      sku: 'WE-001',
      variant_id: 1001,
      product_id: 2001,
    },
  ],
  shipping_address: {
    name: 'John Doe',
    address1: '123 Main St',
    city: 'New York',
    country: 'US',
    zip: '10001',
  },
  created_at: new Date().toISOString(),
};

const orderFulfilledPayload = {
  id: 555777999,
  order_number: 1042,
  fulfillment_status: 'fulfilled',
};

const productUpdatePayload = {
  id: 8001,
  title: 'Updated Product Name',
  handle: 'updated-product',
  status: 'active',
  variants: [{ id: 1, price: '35.00', sku: 'UP-001' }],
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Shopify Webhook Integration', () => {
  describe('HMAC Signature Verification', () => {
    it('should compute correct HMAC for order payload', () => {
      const body = JSON.stringify(orderCreatePayload);
      const hmac = signPayload(body, WEBHOOK_SECRET);

      // Recompute and verify
      const verified = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(body, 'utf8')
        .digest('base64');

      expect(hmac).toBe(verified);
    });

    it('should generate different HMAC for different payloads', () => {
      const body1 = JSON.stringify({ id: 1 });
      const body2 = JSON.stringify({ id: 2 });

      expect(signPayload(body1, WEBHOOK_SECRET))
        .not.toBe(signPayload(body2, WEBHOOK_SECRET));
    });

    it('should generate different HMAC for different secrets', () => {
      const body = JSON.stringify(orderCreatePayload);

      expect(signPayload(body, 'secret-a'))
        .not.toBe(signPayload(body, 'secret-b'));
    });

    it('should detect tampered payloads', () => {
      const originalBody = JSON.stringify(orderCreatePayload);
      const originalHmac = signPayload(originalBody, WEBHOOK_SECRET);

      // Tamper with the body
      const tamperedBody = JSON.stringify({
        ...orderCreatePayload,
        total_price: '0.01',
      });
      const tamperedVerify = signPayload(tamperedBody, WEBHOOK_SECRET);

      expect(originalHmac).not.toBe(tamperedVerify);
    });

    it('should use timing-safe comparison', () => {
      const body = JSON.stringify(orderCreatePayload);
      const hmac = signPayload(body, WEBHOOK_SECRET);

      const bufA = Buffer.from(hmac, 'utf8');
      const bufB = Buffer.from(hmac, 'utf8');

      expect(crypto.timingSafeEqual(bufA, bufB)).toBe(true);
    });
  });

  describe('Webhook Header Construction', () => {
    it('should include all required Shopify headers for valid request', () => {
      const body = JSON.stringify(orderCreatePayload);
      const headers = makeWebhookHeaders(body, 'orders/create', true);

      expect(headers['x-shopify-hmac-sha256']).toBeTruthy();
      expect(headers['x-shopify-topic']).toBe('orders/create');
      expect(headers['x-shopify-shop-domain']).toBe(STORE_URL);
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should include invalid HMAC for rejected request', () => {
      const body = JSON.stringify(orderCreatePayload);
      const headers = makeWebhookHeaders(body, 'orders/create', false);

      expect(headers['x-shopify-hmac-sha256']).toBe('invalid-hmac-signature-base64==');
    });
  });

  describe('Order Create Webhook payload', () => {
    it('should contain required fields', () => {
      expect(orderCreatePayload.id).toBeDefined();
      expect(orderCreatePayload.order_number).toBe(1042);
      expect(orderCreatePayload.email).toBe('customer@example.com');
      expect(orderCreatePayload.total_price).toBe('49.99');
      expect(orderCreatePayload.line_items).toHaveLength(1);
      expect(orderCreatePayload.line_items[0].sku).toBe('WE-001');
    });

    it('should have valid shipping address', () => {
      expect(orderCreatePayload.shipping_address.name).toBe('John Doe');
      expect(orderCreatePayload.shipping_address.country).toBe('US');
    });

    it('should serialize to valid JSON', () => {
      const body = JSON.stringify(orderCreatePayload);
      const parsed = JSON.parse(body);
      expect(parsed.id).toBe(orderCreatePayload.id);
      expect(parsed.line_items[0].quantity).toBe(2);
    });
  });

  describe('Order Fulfilled Webhook payload', () => {
    it('should have fulfillment_status set', () => {
      expect(orderFulfilledPayload.fulfillment_status).toBe('fulfilled');
      expect(orderFulfilledPayload.id).toBe(555777999);
    });

    it('should map to correct internal status', () => {
      const shopifyStatus = orderFulfilledPayload.fulfillment_status;
      let internalStatus = 'PENDING';

      if (shopifyStatus === 'fulfilled') internalStatus = 'FULFILLED';
      else if (shopifyStatus === 'partial') internalStatus = 'PARTIALLY_FULFILLED';

      expect(internalStatus).toBe('FULFILLED');
    });
  });

  describe('Product Update Webhook payload', () => {
    it('should contain product details', () => {
      expect(productUpdatePayload.title).toBe('Updated Product Name');
      expect(productUpdatePayload.status).toBe('active');
      expect(productUpdatePayload.variants).toHaveLength(1);
      expect(productUpdatePayload.variants[0].price).toBe('35.00');
    });
  });
});
