/**
 * Unit tests for shopify.service.ts
 *
 * Tests with mocked fetch:
 * - getOrders returns orders array
 * - getProducts returns products array
 * - getOrder returns single order or null
 * - fulfillOrder sends correct payload
 * - verifyWebhookSignature validates correctly
 * - API errors are handled gracefully
 */

const mockFetch = jest.fn();
global.fetch = mockFetch;

import { ShopifyService } from './shopify.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

function createService(): ShopifyService {
  const configValues: Record<string, string> = {
    SHOPIFY_STORE_URL: 'test-store.myshopify.com',
    SHOPIFY_API_KEY: 'test-api-key',
    SHOPIFY_ACCESS_TOKEN: 'shpat_test_token',
    SHOPIFY_API_SECRET: 'test-webhook-secret',
  };

  const configService = {
    get: jest.fn((key: string) => configValues[key]),
  } as unknown as ConfigService;

  return new ShopifyService(configService);
}

describe('ShopifyService', () => {
  let service: ShopifyService;

  beforeEach(() => {
    service = createService();
    mockFetch.mockReset();
  });

  describe('getOrders', () => {
    it('should return orders array', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'mock-token', expires_in: 86400 }) });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          orders: [
            { id: 1, order_number: 1001, email: 'test@example.com', total_price: '29.99' },
            { id: 2, order_number: 1002, email: 'user@example.com', total_price: '49.99' },
          ],
        }),
      });

      const orders = await service.getOrders();
      expect(orders.length).toBe(2);
      expect(orders[0].order_number).toBe(1001);
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('/admin/api/2024-01/orders.json'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Shopify-Access-Token': 'mock-token',
          }),
        }),
      );
    });

    it('should return empty array on API error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'mock-token', expires_in: 86400 }) });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      const orders = await service.getOrders();
      expect(orders).toEqual([]);
    });
  });

  describe('getProducts', () => {
    it('should return products array', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'mock-token', expires_in: 86400 }) });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          products: [
            { id: 1, title: 'Test Product', status: 'active' },
          ],
        }),
      });

      const products = await service.getProducts();
      expect(products.length).toBe(1);
      expect(products[0].title).toBe('Test Product');
    });
  });

  describe('getOrder', () => {
    it('should return single order', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'mock-token', expires_in: 86400 }) });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          order: { id: 1001, order_number: 1001, email: 'test@example.com' },
        }),
      });

      const order = await service.getOrder(1001);
      expect(order).not.toBeNull();
      expect(order!.id).toBe(1001);
    });

    it('should return null on API error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'mock-token', expires_in: 86400 }) });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not found',
      });

      const order = await service.getOrder(9999);
      expect(order).toBeNull();
    });
  });

  describe('fulfillOrder', () => {
    it('should send fulfillment request', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'mock-token', expires_in: 86400 }) });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ fulfillment: { id: 1 } }),
      });

      const result = await service.fulfillOrder(1001, 1, 'USPS', ['9400111899']);
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('/orders/1001/fulfillments.json'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('should return false on failure', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'mock-token', expires_in: 86400 }) });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        text: async () => 'Unprocessable',
      });

      const result = await service.fulfillOrder(1001, 1);
      expect(result).toBe(false);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should verify valid signature', () => {
      const body = JSON.stringify({ test: true });
      const hmac = crypto.createHmac('sha256', 'test-webhook-secret').update(body, 'utf8').digest('base64');

      expect(service.verifyWebhookSignature(body, hmac)).toBe(true);
    });

    it('should reject invalid signature', () => {
      expect(service.verifyWebhookSignature('body', 'wrong-hmac')).toBe(false);
    });
  });

  describe('getStoreUrl', () => {
    it('should return configured store URL', () => {
      expect(service.getStoreUrl()).toBe('test-store.myshopify.com');
    });
  });
});
