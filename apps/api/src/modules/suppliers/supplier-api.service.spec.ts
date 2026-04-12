/**
 * Unit tests for supplier-api.service.ts
 *
 * Tests the unified supplier dispatcher logic:
 * - CJ search routes correctly and maps prices
 * - AliExpress search routes correctly
 * - Unknown suppliers fall back to mock
 * - API failures degrade gracefully to mock
 *
 * Note: These tests mock at the service layer to avoid Prisma dependency.
 */

// Mock the Prisma-dependent modules before imports
jest.mock('../../config/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../suppliers/suppliers.service', () => ({
  SuppliersService: jest.fn().mockImplementation(() => ({
    findById: jest.fn().mockResolvedValue({ code: 'cjdropshipping', name: 'CJ' }),
    syncProductFromExternal: jest.fn(),
  })),
}));

import { SupplierApiService } from './supplier-api.service';
import { CJDropshippingService } from './cj-dropshipping.service';
import { AliExpressService } from './aliexpress.service';
import { ConfigService } from '@nestjs/config';

describe('SupplierApiService', () => {
  let service: SupplierApiService;
  let mockCJ: Partial<CJDropshippingService>;
  let mockAE: Partial<AliExpressService>;

  beforeEach(() => {
    mockCJ = {
      searchProducts: jest.fn().mockResolvedValue({
        products: [
          {
            pid: 'cj-001',
            productName: 'CJ Wireless Earbuds',
            productNameEn: 'CJ Wireless Earbuds',
            sellPrice: 8.50,
            productWeight: 50,
            productUnit: 'pc',
            categoryId: '1',
            categoryName: 'Electronics',
            productImage: 'https://cj.com/img.jpg',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      }),
      getProduct: jest.fn().mockResolvedValue({
        pid: 'cj-001',
        productName: 'CJ Wireless Earbuds',
        productNameEn: 'CJ Wireless Earbuds',
        sellPrice: 8.50,
        productWeight: 50,
        productUnit: 'pc',
        categoryId: '1',
        categoryName: 'Electronics',
        productImage: 'https://cj.com/img.jpg',
      }),
    };

    mockAE = {
      searchProducts: jest.fn().mockResolvedValue({
        products: [
          {
            product_id: 'ae-001',
            product_title: 'AE Bluetooth Speaker',
            product_main_image_url: 'https://ae.com/img.jpg',
            target_sale_price: '12.99',
            target_sale_price_currency: 'USD',
            original_price: '15.99',
            product_detail_url: 'https://ae.com/item/ae-001',
          },
        ],
        total: 1,
        page: 1,
        hasMore: false,
      }),
      getProduct: jest.fn().mockResolvedValue({
        product_id: 'ae-001',
        product_title: 'AE Bluetooth Speaker',
        product_main_image_url: 'https://ae.com/img.jpg',
        target_sale_price: '12.99',
        target_sale_price_currency: 'USD',
        original_price: '15.99',
        product_detail_url: 'https://ae.com/item/ae-001',
      }),
    };

    const configService = { get: jest.fn() } as unknown as ConfigService;
    const suppliersService = {
      findById: jest.fn().mockResolvedValue({ code: 'cjdropshipping', name: 'CJ' }),
      syncProductFromExternal: jest.fn(),
    } as any;

    service = new SupplierApiService(
      configService,
      suppliersService,
      mockCJ as CJDropshippingService,
      mockAE as AliExpressService,
    );
  });

  describe('searchProducts', () => {
    it('should route CJ queries to CJDropshippingService', async () => {
      const result = await service.searchProducts('cjdropshipping', 'earbuds');
      expect(mockCJ.searchProducts).toHaveBeenCalledWith('earbuds', 1, 20);
      expect(result.products.length).toBe(1);
      // Verify price mapping (1.4x markup)
      expect(result.products[0].price).toBeCloseTo(8.50 * 1.4, 1);
      expect(result.products[0].costPrice).toBe(8.50);
    });

    it('should route AliExpress queries to AliExpressService', async () => {
      const result = await service.searchProducts('aliexpress', 'speaker');
      expect(mockAE.searchProducts).toHaveBeenCalledWith('speaker', 1, 20);
      expect(result.products.length).toBe(1);
      expect(result.products[0].externalId).toBe('ae-001');
    });

    it('should fall back to mock for unknown suppliers', async () => {
      const result = await service.searchProducts('unknown_supplier', 'test');
      expect(result.products.length).toBeGreaterThan(0);
      expect(result.products[0].externalId).toContain('unknown_supplier');
    });

    it('should fall back to mock when CJ API throws', async () => {
      (mockCJ.searchProducts as jest.Mock).mockRejectedValue(
        new Error('CJ API unavailable'),
      );
      const result = await service.searchProducts('cjdropshipping', 'earbuds');
      // Should get mock data, not throw
      expect(result.products.length).toBeGreaterThan(0);
    });
  });

  describe('getProductDetails', () => {
    it('should return CJ product mapped to unified format', async () => {
      const result = await service.getProductDetails('cjdropshipping', 'cj-001');
      expect(result).not.toBeNull();
      expect(result!.title).toBe('CJ Wireless Earbuds');
      expect(result!.currency).toBe('USD');
    });

    it('should return AE product mapped to unified format', async () => {
      const result = await service.getProductDetails('aliexpress', 'ae-001');
      expect(result).not.toBeNull();
      expect(result!.title).toBe('AE Bluetooth Speaker');
    });
  });
});
