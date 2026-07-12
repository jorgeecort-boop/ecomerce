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
  let suppliersService: any;
  let prisma: any;

  beforeEach(() => {
    mockCJ = {
      searchProducts: jest.fn().mockResolvedValue({
        products: [
          {
            pid: 'cj-001',
            productName: 'CJ Wireless Earbuds',
            productNameEn: 'CJ Wireless Earbuds',
            sellPrice: 8.5,
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
        sellPrice: 8.5,
        productWeight: 50,
        productUnit: 'pc',
        categoryId: '1',
        categoryName: 'Electronics',
        productImage: 'https://cj.com/img.jpg',
      }),
      createOrder: jest.fn().mockResolvedValue({
        orderId: 'cj-order-001',
        orderNum: 'CJ-001',
        status: 'pending',
        trackNumber: 'CJTRACK123',
        logisticName: 'CJ Logistics',
        createTime: new Date().toISOString(),
      }),
      confirmOrder: jest.fn().mockResolvedValue({ success: true }),
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
      createOrder: jest.fn().mockResolvedValue({
        orderId: 'ae-order-001',
        status: 'CREATED',
      }),
    };

    const configService = { get: jest.fn() } as unknown as ConfigService;
    suppliersService = {
      findById: jest.fn().mockResolvedValue({ code: 'cjdropshipping', name: 'CJ' }),
      findByCode: jest
        .fn()
        .mockResolvedValue({ id: 'supplier-1', code: 'cjdropshipping', name: 'CJ' }),
      create: jest.fn(),
      syncProductFromExternal: jest.fn(),
    } as any;
    prisma = {
      product: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    service = new SupplierApiService(
      configService,
      suppliersService,
      mockCJ as CJDropshippingService,
      mockAE as AliExpressService,
      prisma
    );
  });

  describe('searchProducts', () => {
    it('should route CJ queries to CJDropshippingService', async () => {
      const result = await service.searchProducts('cjdropshipping', 'earbuds');
      expect(mockCJ.searchProducts).toHaveBeenCalledWith('earbuds', 1, 20);
      expect(result.products.length).toBe(1);
      // Verify price mapping (1.4x markup)
      expect(result.products[0].price).toBeCloseTo(8.5 * 1.4, 1);
      expect(result.products[0].costPrice).toBe(8.5);
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
      (mockCJ.searchProducts as jest.Mock).mockRejectedValue(new Error('CJ API unavailable'));
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

  describe('importToStore', () => {
    it('should create a store product from supplier product data', async () => {
      suppliersService.syncProductFromExternal.mockResolvedValue({
        id: 'supplier-product-1',
      });
      suppliersService.mapToProduct = jest.fn().mockResolvedValue({
        id: 'supplier-product-1',
        ourProductId: 'product-1',
      });
      prisma.product.create.mockResolvedValue({ id: 'product-1' });

      const result = await service.importToStore('cjdropshipping', ['cj-001'], 'store-1', 2);

      expect(result).toEqual({ success: ['cj-001'], failed: [] });
      expect(suppliersService.syncProductFromExternal).toHaveBeenCalledWith(
        'supplier-1',
        expect.objectContaining({
          externalId: 'cj-001',
          title: 'CJ Wireless Earbuds',
          costPrice: 8.5,
        })
      );
      expect(prisma.product.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          storeId: 'store-1',
          title: 'CJ Wireless Earbuds',
          price: 17,
          costPrice: 8.5,
          supplierId: 'supplier-1',
          supplierProductId: 'supplier-product-1',
          isPublished: false,
        }),
      });
      expect(suppliersService.mapToProduct).toHaveBeenCalledWith('supplier-product-1', 'product-1');
    });
  });

  describe('dispatchOrder', () => {
    it('should dispatch to CJ and call createOrder + confirmOrder', async () => {
      const result = await service.dispatchOrder(
        'cjdropshipping',
        [{ externalId: 'cj-001', variantId: 'vid-001', quantity: 2 }],
        { name: 'John Doe', phone: '123', country: 'US', city: 'NY', address: '123 St', state: 'NY', postalCode: '10001' },
        'ORDER-TEST-001',
      );

      expect(mockCJ.createOrder).toHaveBeenCalled();
      expect(mockCJ.confirmOrder).toHaveBeenCalledWith('cj-order-001');
      expect(result.success).toBe(true);
      expect(result.externalOrderId).toBe('cj-order-001');
      expect(result.trackingNumber).toBe('CJTRACK123');
    });

    it('should dispatch to AliExpress and call createOrder', async () => {
      const result = await service.dispatchOrder(
        'aliexpress',
        [{ externalId: 'ae-001', variantId: 'sku-001', quantity: 1 }],
        { name: 'Jane Doe', phone: '456', country: 'Colombia', city: 'Bogota', address: 'Av 1', postalCode: '11001' },
        'ORDER-TEST-002',
      );

      expect(mockAE.createOrder).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.externalOrderId).toBe('ae-order-001');
    });

    it('should return error for unknown supplier', async () => {
      const result = await service.dispatchOrder(
        'unknown',
        [{ externalId: 'x', variantId: 'y', quantity: 1 }],
        {},
        'ORDER-TEST-003',
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported supplier');
    });

    it('should handle CJ createOrder failure gracefully', async () => {
      (mockCJ.createOrder as jest.Mock).mockRejectedValue(new Error('CJ API timeout'));

      const result = await service.dispatchOrder(
        'cjdropshipping',
        [{ externalId: 'cj-001', variantId: 'vid-001', quantity: 1 }],
        { name: 'John', phone: '123', country: 'US', city: 'NY', address: '123 St', postalCode: '10001' },
        'ORDER-TEST-004',
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('CJ API timeout');
    });
  });
});
