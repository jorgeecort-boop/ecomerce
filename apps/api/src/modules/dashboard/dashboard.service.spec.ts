import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../config/prisma.service';
import { DashboardService } from './dashboard.service';
import { StoreAccessService } from '../stores/store-access.service';

// Mock the entire StoreAccessService
jest.mock('../stores/store-access.service');

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: PrismaService;
  let mockStoreAccessService: jest.Mocked<StoreAccessService>;

  const mockPrisma = {
    store: {
      findMany: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
    },
    orderItem: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrisma },
        StoreAccessService,
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    prisma = module.get<PrismaService>(PrismaService);
    mockStoreAccessService = module.get(StoreAccessService);

    jest.clearAllMocks();
  });

  const mockOrder = {
    id: 'order-1',
    total: 100,
    createdAt: new Date(),
    items: [],
  };

  const mockProduct = {
    id: 'prod-1',
    title: 'Test Product',
    inventory: 5,
    trackInventory: true,
  };

  const mockOrderItem = {
    id: 'item-1',
    productId: 'prod-1',
    title: 'Test Product',
    quantity: 2,
    total: 200,
    product: mockProduct,
  };

  describe('getStoreStats', () => {
    it('should return comprehensive store statistics', async () => {
      mockPrisma.order.findMany.mockResolvedValue([mockOrder]);
      mockPrisma.product.findMany
        .mockResolvedValueOnce([mockProduct])
        .mockResolvedValueOnce([mockProduct]);
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { total: 5000 } });
      mockPrisma.order.count.mockResolvedValue(50);
      mockPrisma.order.findMany.mockResolvedValueOnce([mockOrder]);
      mockPrisma.order.groupBy.mockResolvedValue([{ status: 'PENDING', _count: { id: 10 } }]);
      mockPrisma.orderItem.findMany.mockResolvedValue([mockOrderItem]);

      const result = await service.getStoreStats('store-1');

      expect(result.overview.totalRevenue).toBe(5000);
      expect(result.overview.totalOrders).toBe(50);
      expect(result.overview.totalProducts).toBe(1);
      expect(result.overview.totalStores).toBe(1);
      expect(result.revenueByDay).toBeDefined();
      expect(result.topProducts).toBeDefined();
      expect(result.ordersByStatus).toBeDefined();
      expect(result.recentOrders).toBeDefined();
      expect(result.lowStockProducts).toBeDefined();
    });

    it('should handle zero revenue gracefully', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { total: null } });
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.groupBy.mockResolvedValue([]);
      mockPrisma.orderItem.findMany.mockResolvedValue([]);

      const result = await service.getStoreStats('store-1');

      expect(result.overview.totalRevenue).toBe(0);
      expect(result.overview.totalOrders).toBe(0);
      expect(result.revenueByDay.length).toBe(7);
      expect(result.revenueByDay.every((r: any) => r.revenue === 0)).toBe(true);
      expect(result.topProducts).toEqual([]);
    });
  });

  describe('getUserStats', () => {
    it('should return empty stats when user has no stores', async () => {
      mockStoreAccessService.getUserStoreIds.mockResolvedValue([]);
      mockPrisma.store.findMany.mockResolvedValue([]);

      const result = await service.getUserStats('user-1');

      expect(result.overview.totalStores).toBe(0);
      expect(result.overview.totalRevenue).toBe(0);
      expect(result.revenueByDay).toEqual([]);
      expect(result.topProducts).toEqual([]);
    });

    it('should aggregate stats across all user stores', async () => {
      mockStoreAccessService.getUserStoreIds.mockResolvedValue(['store-1', 'store-2']);
      mockPrisma.store.findMany.mockResolvedValue([{ id: 'store-1' }, { id: 'store-2' }]);
      mockPrisma.order.findMany.mockResolvedValue([mockOrder]);
      mockPrisma.product.findMany.mockResolvedValue([
        mockProduct,
        { ...mockProduct, id: 'prod-2' },
      ]);
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { total: 10000 } });
      mockPrisma.order.count.mockResolvedValue(100);
      mockPrisma.order.findMany.mockResolvedValueOnce([mockOrder]);
      mockPrisma.order.groupBy.mockResolvedValue([{ status: 'CONFIRMED', _count: { id: 50 } }]);
      mockPrisma.orderItem.findMany.mockResolvedValue([mockOrderItem]);

      const result = await service.getUserStats('user-1');

      expect(result.overview.totalStores).toBe(2);
      expect(result.overview.totalRevenue).toBe(10000);
      expect(result.overview.totalOrders).toBe(100);
      expect(result.overview.totalProducts).toBe(2);
    });
  });

  describe('getRevenueByDay', () => {
    it('should return revenue grouped by day for last 7 days', async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        { total: 100, createdAt: new Date() },
        { total: 200, createdAt: new Date(Date.now() - 86400000) },
      ]);

      const result = await (service as any).getRevenueByDay('store-1');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(7);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('revenue');
    });

    it('should return zeros for days with no orders', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);

      const result = await (service as any).getRevenueByDay('store-1');

      expect(result.length).toBe(7);
      expect(result.every((r: any) => r.revenue === 0)).toBe(true);
    });
  });

  describe('getRevenueByDays', () => {
    it('should return revenue for multiple stores', async () => {
      mockPrisma.order.findMany.mockResolvedValue([{ total: 100, createdAt: new Date() }]);

      const result = await (service as any).getRevenueByDays(['store-1', 'store-2']);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(7);
    });
  });

  describe('getTopProducts', () => {
    it('should return top 5 products by revenue', async () => {
      mockPrisma.orderItem.findMany.mockResolvedValue([
        mockOrderItem,
        {
          ...mockOrderItem,
          id: 'item-2',
          productId: 'prod-2',
          title: 'Product 2',
          quantity: 5,
          total: 500,
        },
        {
          ...mockOrderItem,
          id: 'item-3',
          productId: 'prod-1',
          title: 'Test Product',
          quantity: 1,
          total: 100,
        },
      ]);

      const result = await (service as any).getTopProducts('store-1');

      expect(result.length).toBe(2);
      expect(result[0].id).toBe('prod-2');
      expect(result[0].revenue).toBe(500);
      expect(result[0].orders).toBe(5);
    });

    it('should aggregate quantities and revenue for same product', async () => {
      mockPrisma.orderItem.findMany.mockResolvedValue([
        mockOrderItem,
        {
          ...mockOrderItem,
          id: 'item-2',
          productId: 'prod-1',
          title: 'Test Product',
          quantity: 3,
          total: 300,
        },
      ]);

      const result = await (service as any).getTopProducts('store-1');

      expect(result.length).toBe(1);
      expect(result[0].orders).toBe(5);
      expect(result[0].revenue).toBe(500);
    });

    it('should return empty array when no order items', async () => {
      mockPrisma.orderItem.findMany.mockResolvedValue([]);

      const result = await (service as any).getTopProducts('store-1');

      expect(result).toEqual([]);
    });
  });

  describe('getTopProductsByStores', () => {
    it('should return top products across multiple stores', async () => {
      mockPrisma.orderItem.findMany.mockResolvedValue([
        mockOrderItem,
        {
          ...mockOrderItem,
          id: 'item-2',
          productId: 'prod-2',
          title: 'Product 2',
          quantity: 5,
          total: 500,
        },
      ]);

      const result = await (service as any).getTopProductsByStores(['store-1', 'store-2']);

      expect(result.length).toBe(2);
      expect(result[0].id).toBe('prod-2');
    });
  });

  describe('getOrdersByStatus', () => {
    it('should return order counts grouped by status', async () => {
      mockPrisma.order.groupBy.mockResolvedValue([
        { status: 'PENDING', _count: { id: 10 } },
        { status: 'CONFIRMED', _count: { id: 25 } },
        { status: 'SHIPPED', _count: { id: 15 } },
      ]);

      const result = await (service as any).getOrdersByStatus('store-1');

      expect(result).toEqual([
        { status: 'PENDING', count: 10 },
        { status: 'CONFIRMED', count: 25 },
        { status: 'SHIPPED', count: 15 },
      ]);
    });

    it('should return empty array when no orders', async () => {
      mockPrisma.order.groupBy.mockResolvedValue([]);

      const result = await (service as any).getOrdersByStatus('store-1');

      expect(result).toEqual([]);
    });
  });

  describe('getOrdersByStatusByStores', () => {
    it('should return order counts for multiple stores', async () => {
      mockPrisma.order.groupBy.mockResolvedValue([
        { status: 'PENDING', _count: { id: 20 } },
        { status: 'DELIVERED', _count: { id: 30 } },
      ]);

      const result = await (service as any).getOrdersByStatusByStores(['store-1', 'store-2']);

      expect(result).toEqual([
        { status: 'PENDING', count: 20 },
        { status: 'DELIVERED', count: 30 },
      ]);
    });
  });
});
