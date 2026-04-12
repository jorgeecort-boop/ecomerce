import { Test, TestingModule } from '@nestjs/testing';
import { DashboardUnifiedService } from './dashboard-unified.service';
import { PrismaService } from '../../config/prisma.service';
import { ShopifyService } from '../shopify/shopify.service';
import { AutoFulfillmentService } from '../shopify/auto-fulfillment.service';

describe('DashboardUnifiedService', () => {
  let service: DashboardUnifiedService;
  let prisma: PrismaService;

  const mockPrisma = {
    store: {
      findMany: jest.fn(),
    },
    order: {
      aggregate: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    product: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    supplierOrder: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockShopifyService = {
    getOrders: jest.fn(),
    getProducts: jest.fn(),
    getStats: jest.fn(),
  };

  const mockAutoFulfillmentService = {
    getStats: jest.fn(),
    getSyncedOrders: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardUnifiedService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ShopifyService, useValue: mockShopifyService },
        { provide: AutoFulfillmentService, useValue: mockAutoFulfillmentService },
      ],
    }).compile();

    service = module.get<DashboardUnifiedService>(DashboardUnifiedService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('getUnifiedStats', () => {
    it('should return empty stats when no stores and no userId', async () => {
      mockAutoFulfillmentService.getStats.mockResolvedValue({
        totalRevenue: 0,
        totalOrders: 0,
        pendingOrders: 0,
        fulfillmentRate: 0,
      });

      const result = await service.getUnifiedStats();

      expect(result.overview.totalRevenue).toBe('0.00');
      expect(result.overview.totalOrders).toBe(0);
      expect(result.ecommerce.revenue).toBe(0);
    });

    it('should return stats for specific storeId', async () => {
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { total: 5000 } });
      mockPrisma.order.count.mockResolvedValueOnce(50).mockResolvedValueOnce(10);
      mockPrisma.product.count.mockResolvedValue(20);
      mockAutoFulfillmentService.getStats.mockResolvedValue({
        totalRevenue: 3000,
        totalOrders: 30,
        pendingOrders: 5,
        fulfillmentRate: 85,
      });

      const result = await service.getUnifiedStats(undefined, 'store-1');

      expect(result.overview.totalRevenue).toBe('8000.00');
      expect(result.overview.totalOrders).toBe(80);
      expect(result.overview.pendingOrders).toBe(15);
      expect(result.overview.fulfillmentRate).toBe(85);
      expect(result.ecommerce.revenue).toBe(5000);
      expect(result.shopify.totalRevenue).toBe(3000);
    });

    it('should aggregate stats across user stores when no storeId', async () => {
      mockPrisma.store.findMany.mockResolvedValue([{ id: 'store-1' }, { id: 'store-2' }]);
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { total: 10000 } });
      mockPrisma.order.count.mockResolvedValueOnce(100).mockResolvedValueOnce(20);
      mockPrisma.product.count.mockResolvedValue(50);
      mockAutoFulfillmentService.getStats.mockResolvedValue({
        totalRevenue: 5000,
        totalOrders: 40,
        pendingOrders: 10,
        fulfillmentRate: 75,
      });

      const result = await service.getUnifiedStats('user-1');

      expect(result.overview.totalRevenue).toBe('15000.00');
      expect(result.overview.totalOrders).toBe(140);
      expect(result.overview.pendingOrders).toBe(30);
    });

    it('should handle null revenue gracefully', async () => {
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { total: null } });
      mockPrisma.order.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
      mockPrisma.product.count.mockResolvedValue(0);
      mockAutoFulfillmentService.getStats.mockResolvedValue({
        totalRevenue: 0,
        totalOrders: 0,
        pendingOrders: 0,
        fulfillmentRate: 0,
      });

      const result = await service.getUnifiedStats(undefined, 'store-1');

      expect(result.overview.totalRevenue).toBe('0.00');
      expect(result.ecommerce.revenue).toBe(0);
    });
  });

  describe('getUnifiedOrders', () => {
    it('should return orders from all sources', async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        { id: 'order-1', storeId: 'store-1', total: 100 },
      ]);
      mockAutoFulfillmentService.getSyncedOrders.mockResolvedValue([
        { id: 'sync-1', shopifyOrderId: 'shop-1' },
      ]);
      mockPrisma.supplierOrder.findMany.mockResolvedValue([
        { id: 'sup-order-1', status: 'PENDING' },
      ]);

      const result = await service.getUnifiedOrders(undefined, 'store-1');

      expect(result.ecommerce).toHaveLength(1);
      expect(result.shopify).toHaveLength(1);
      expect(result.suppliers).toHaveLength(1);
    });

    it('should fetch orders for user stores when no storeId', async () => {
      mockPrisma.store.findMany.mockResolvedValue([{ id: 'store-1' }]);
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockAutoFulfillmentService.getSyncedOrders.mockResolvedValue([]);
      mockPrisma.supplierOrder.findMany.mockResolvedValue([]);

      await service.getUnifiedOrders('user-1');

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { storeId: { in: ['store-1'] } },
        })
      );
    });

    it('should return empty arrays when no orders exist', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockAutoFulfillmentService.getSyncedOrders.mockResolvedValue([]);
      mockPrisma.supplierOrder.findMany.mockResolvedValue([]);

      const result = await service.getUnifiedOrders();

      expect(result.ecommerce).toEqual([]);
      expect(result.shopify).toEqual([]);
      expect(result.suppliers).toEqual([]);
    });
  });

  describe('getInventoryStatus', () => {
    it('should return inventory status for specific store', async () => {
      mockPrisma.product.findMany
        .mockResolvedValueOnce([{ id: 'p1', title: 'Low Stock', inventory: 5, sku: 'SKU-1' }])
        .mockResolvedValueOnce([{ id: 'p2', title: 'Out of Stock', inventory: 0, sku: 'SKU-2' }]);
      mockPrisma.product.count.mockResolvedValue(100);

      const result = await service.getInventoryStatus('store-1');

      expect(result.totalProducts).toBe(100);
      expect(result.lowStock).toBe(1);
      expect(result.outOfStock).toBe(1);
      expect(result.lowStockProducts).toHaveLength(1);
      expect(result.outOfStockProducts).toHaveLength(1);
    });

    it('should return inventory status for all stores when no storeId', async () => {
      mockPrisma.product.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      mockPrisma.product.count.mockResolvedValue(50);

      const result = await service.getInventoryStatus();

      expect(result.totalProducts).toBe(50);
      expect(result.lowStock).toBe(0);
      expect(result.outOfStock).toBe(0);
    });

    it('should only count products with trackInventory enabled', async () => {
      mockPrisma.product.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      mockPrisma.product.count.mockResolvedValue(0);

      await service.getInventoryStatus('store-1');

      expect(mockPrisma.product.findMany).toHaveBeenNthCalledWith(1, {
        where: { storeId: 'store-1', trackInventory: true, inventory: { lte: 10, gt: 0 } },
        select: { id: true, title: true, inventory: true, sku: true },
        take: 20,
      });
    });
  });

  describe('getRevenueByDay', () => {
    it('should return revenue grouped by day for last 7 days', async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        { total: 100, createdAt: new Date() },
        { total: 200, createdAt: new Date(Date.now() - 86400000) },
      ]);

      const result = await service.getRevenueByDay('store-1', 7);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(7);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('revenue');
    });

    it('should return zeros for days with no orders', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);

      const result = await service.getRevenueByDay('store-1', 7);

      expect(result.length).toBe(7);
      expect(result.every((r: any) => r.revenue === 0)).toBe(true);
    });

    it('should use default 7 days', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);

      await service.getRevenueByDay('store-1');

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            storeId: 'store-1',
            paymentStatus: 'PAID',
          }),
        })
      );
    });

    it('should aggregate revenue for same day', async () => {
      const today = new Date();
      mockPrisma.order.findMany.mockResolvedValue([
        { total: 100, createdAt: today },
        { total: 150, createdAt: today },
      ]);

      const result = await service.getRevenueByDay('store-1', 1);

      const todayEntry = result.find((r: any) => r.date === today.toISOString().split('T')[0]);
      expect(todayEntry?.revenue).toBe(250);
    });
  });
});
