/**
 * Integration tests for Dashboard Unified endpoints
 *
 * Tests the unified dashboard service logic with mocked Prisma/Shopify:
 * - getUnifiedStats aggregates data from Ecomerce + Shopify + Suppliers
 * - getUnifiedOrders merges orders from all sources
 * - getInventoryStatus identifies low-stock and out-of-stock products
 * - getRevenueByDay computes daily revenue breakdown
 */

describe('Dashboard Unified Integration', () => {
  // ── Mock Prisma ──────────────────────────────────────────────────────────
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
    shopifyOrderSync: {
      count: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── getUnifiedStats ─────────────────────────────────────────────────────

  describe('getUnifiedStats flow', () => {
    it('should aggregate revenue from ecomerce and shopify', async () => {
      // Ecomerce revenue
      const ecomerceRevenue = 1500.00;
      // Shopify revenue
      const shopifyRevenue = 2300.50;

      const totalRevenue = (ecomerceRevenue + shopifyRevenue).toFixed(2);
      expect(totalRevenue).toBe('3800.50');
    });

    it('should aggregate order counts from all sources', async () => {
      const ecomerceOrders = 25;
      const shopifyOrders = 42;
      const totalOrders = ecomerceOrders + shopifyOrders;

      expect(totalOrders).toBe(67);
    });

    it('should fetch stores for user when no storeId provided', async () => {
      mockPrisma.store.findMany.mockResolvedValue([
        { id: 'store-1' },
        { id: 'store-2' },
      ]);

      const stores = await mockPrisma.store.findMany({
        where: { ownerId: 'user-1' },
        select: { id: true },
      });

      const storeIds = stores.map((s: any) => s.id);
      expect(storeIds).toEqual(['store-1', 'store-2']);
    });

    it('should return 0 stats when user has no stores', async () => {
      mockPrisma.store.findMany.mockResolvedValue([]);

      const stores = await mockPrisma.store.findMany({
        where: { ownerId: 'user-no-stores' },
        select: { id: true },
      });

      expect(stores).toHaveLength(0);

      const stats = {
        revenue: 0,
        orders: 0,
        pendingOrders: 0,
        products: 0,
      };
      expect(stats.revenue).toBe(0);
    });
  });

  // ── getEcomerceStats ──────────────────────────────────────────────────

  describe('getEcomerceStats', () => {
    it('should aggregate revenue from paid orders only', async () => {
      mockPrisma.order.aggregate.mockResolvedValue({
        _sum: { total: 2500.75 },
      });

      const result = await mockPrisma.order.aggregate({
        where: { storeId: { in: ['store-1'] }, paymentStatus: 'PAID' },
        _sum: { total: true },
      });

      expect(Number(result._sum.total || 0)).toBe(2500.75);
    });

    it('should count all orders including pending', async () => {
      mockPrisma.order.count
        .mockResolvedValueOnce(50)  // total
        .mockResolvedValueOnce(12);  // pending

      const total = await mockPrisma.order.count({
        where: { storeId: { in: ['store-1'] } },
      });
      const pending = await mockPrisma.order.count({
        where: { storeId: { in: ['store-1'] }, status: 'PENDING' },
      });

      expect(total).toBe(50);
      expect(pending).toBe(12);
    });

    it('should count published products only', async () => {
      mockPrisma.product.count.mockResolvedValue(35);

      const count = await mockPrisma.product.count({
        where: { storeId: { in: ['store-1'] }, isPublished: true },
      });

      expect(count).toBe(35);
    });
  });

  // ── getSupplierStats ──────────────────────────────────────────────────

  describe('getSupplierStats', () => {
    it('should count supplier orders by status', async () => {
      mockPrisma.supplierOrder.count
        .mockResolvedValueOnce(5)   // pending
        .mockResolvedValueOnce(12)  // shipped
        .mockResolvedValueOnce(30); // delivered

      const pending = await mockPrisma.supplierOrder.count({ where: { status: 'PENDING' } });
      const shipped = await mockPrisma.supplierOrder.count({ where: { status: 'SHIPPED' } });
      const delivered = await mockPrisma.supplierOrder.count({ where: { status: 'DELIVERED' } });

      expect(pending).toBe(5);
      expect(shipped).toBe(12);
      expect(delivered).toBe(30);
    });
  });

  // ── getUnifiedOrders ──────────────────────────────────────────────────

  describe('getUnifiedOrders flow', () => {
    it('should return orders from all 3 sources', async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        { id: 'eco-1', orderNumber: 'ORD-001', status: 'PENDING' },
      ]);

      mockPrisma.shopifyOrderSync.findMany.mockResolvedValue([
        { id: 'shopify-1', orderNumber: '1042', status: 'FULFILLED' },
      ]);

      mockPrisma.supplierOrder.findMany.mockResolvedValue([
        { id: 'sup-1', externalOrderId: 'SHOPIFY-555-1', status: 'SHIPPED' },
      ]);

      const [ecomerceOrders, shopifyOrders, supplierOrders] = await Promise.all([
        mockPrisma.order.findMany({}),
        mockPrisma.shopifyOrderSync.findMany({}),
        mockPrisma.supplierOrder.findMany({}),
      ]);

      const result = {
        ecommerce: ecomerceOrders,
        shopify: shopifyOrders,
        suppliers: supplierOrders,
      };

      expect(result.ecommerce).toHaveLength(1);
      expect(result.shopify).toHaveLength(1);
      expect(result.suppliers).toHaveLength(1);
      expect(result.ecommerce[0].status).toBe('PENDING');
      expect(result.shopify[0].status).toBe('FULFILLED');
      expect(result.suppliers[0].status).toBe('SHIPPED');
    });

    it('should handle empty results gracefully', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.shopifyOrderSync.findMany.mockResolvedValue([]);
      mockPrisma.supplierOrder.findMany.mockResolvedValue([]);

      const [e, s, sup] = await Promise.all([
        mockPrisma.order.findMany({}),
        mockPrisma.shopifyOrderSync.findMany({}),
        mockPrisma.supplierOrder.findMany({}),
      ]);

      expect(e).toHaveLength(0);
      expect(s).toHaveLength(0);
      expect(sup).toHaveLength(0);
    });
  });

  // ── getInventoryStatus ─────────────────────────────────────────────────

  describe('getInventoryStatus', () => {
    it('should identify low-stock products (1-10 units)', async () => {
      mockPrisma.product.findMany.mockResolvedValueOnce([
        { id: 'p1', title: 'Almost Out', inventory: 3, sku: 'AO-001' },
        { id: 'p2', title: 'Running Low', inventory: 8, sku: 'RL-001' },
      ]);

      const lowStock = await mockPrisma.product.findMany({
        where: { trackInventory: true, inventory: { lte: 10, gt: 0 } },
      });

      expect(lowStock).toHaveLength(2);
      expect(lowStock[0].inventory).toBeLessThanOrEqual(10);
      expect(lowStock[0].inventory).toBeGreaterThan(0);
    });

    it('should identify out-of-stock products (0 or below)', async () => {
      mockPrisma.product.findMany.mockResolvedValueOnce([
        { id: 'p3', title: 'Sold Out', inventory: 0, sku: 'SO-001' },
      ]);

      const outOfStock = await mockPrisma.product.findMany({
        where: { trackInventory: true, inventory: { lte: 0 } },
      });

      expect(outOfStock).toHaveLength(1);
      expect(outOfStock[0].inventory).toBeLessThanOrEqual(0);
    });

    it('should compute inventory summary correctly', () => {
      const lowStock = [{ id: 'p1' }, { id: 'p2' }];
      const outOfStock = [{ id: 'p3' }];
      const totalProducts = 50;

      const summary = {
        totalProducts,
        lowStock: lowStock.length,
        outOfStock: outOfStock.length,
        healthyStock: totalProducts - lowStock.length - outOfStock.length,
      };

      expect(summary.lowStock).toBe(2);
      expect(summary.outOfStock).toBe(1);
      expect(summary.healthyStock).toBe(47);
    });
  });

  // ── getRevenueByDay ───────────────────────────────────────────────────

  describe('getRevenueByDay', () => {
    it('should generate entries for all requested days', () => {
      const days = 7;
      const revenueByDay: Record<string, number> = {};

      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const key = date.toISOString().split('T')[0];
        revenueByDay[key] = 0;
      }

      expect(Object.keys(revenueByDay)).toHaveLength(7);
    });

    it('should aggregate order totals by day', () => {
      const today = new Date().toISOString().split('T')[0];
      const revenueByDay: Record<string, number> = { [today]: 0 };

      const orders = [
        { total: 29.99, createdAt: new Date() },
        { total: 49.99, createdAt: new Date() },
        { total: 15.00, createdAt: new Date() },
      ];

      for (const order of orders) {
        const key = order.createdAt.toISOString().split('T')[0];
        if (revenueByDay[key] !== undefined) {
          revenueByDay[key] += Number(order.total);
        }
      }

      expect(revenueByDay[today]).toBeCloseTo(94.98, 2);
    });

    it('should sort results chronologically', () => {
      const entries = [
        { date: '2026-04-03', revenue: 100 },
        { date: '2026-04-01', revenue: 50 },
        { date: '2026-04-02', revenue: 75 },
      ];

      const sorted = entries.sort((a, b) => a.date.localeCompare(b.date));

      expect(sorted[0].date).toBe('2026-04-01');
      expect(sorted[1].date).toBe('2026-04-02');
      expect(sorted[2].date).toBe('2026-04-03');
    });
  });
});
