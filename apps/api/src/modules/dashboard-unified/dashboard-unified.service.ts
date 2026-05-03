import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { ShopifyService } from '../shopify/shopify.service';
import { AutoFulfillmentService } from '../shopify/auto-fulfillment.service';

@Injectable()
export class DashboardUnifiedService {
  private readonly logger = new Logger(DashboardUnifiedService.name);

  constructor(
    private prisma: PrismaService,
    private shopifyIntegration: ShopifyService,
    private autoFulfillmentService: AutoFulfillmentService,
  ) {}

  async getUnifiedStats(userId?: string, storeId?: string) {
    const storeIds = storeId ? [storeId] : [];

    if (!storeId && userId) {
      const stores = await this.prisma.store.findMany({
        where: { ownerId: userId },
        select: { id: true },
      });
      storeIds.push(...stores.map((s) => s.id));
    }

    const [ecomerceStats, shopifyStats, supplierStats] = await Promise.all([
      this.getEcomerceStats(storeIds),
      this.autoFulfillmentService.getStats(storeId),
      this.getSupplierStats(storeId),
    ]);

    return {
      overview: {
        totalRevenue: (ecomerceStats.revenue + shopifyStats.totalRevenue).toFixed(2),
        totalOrders: ecomerceStats.orders + shopifyStats.totalOrders,
        pendingOrders: ecomerceStats.pendingOrders + shopifyStats.pendingOrders,
        fulfillmentRate: shopifyStats.fulfillmentRate,
      },
      ecommerce: ecomerceStats,
      shopify: shopifyStats,
      suppliers: supplierStats,
    };
  }

  private async getEcomerceStats(storeIds: string[]) {
    if (storeIds.length === 0) {
      return { revenue: 0, orders: 0, pendingOrders: 0, products: 0 };
    }

    const [revenue, orders, pendingOrders, products] = await Promise.all([
      this.prisma.order.aggregate({
        where: { storeId: { in: storeIds }, paymentStatus: 'PAID' },
        _sum: { total: true },
      }),
      this.prisma.order.count({ where: { storeId: { in: storeIds } } }),
      this.prisma.order.count({ where: { storeId: { in: storeIds }, status: 'PENDING' } }),
      this.prisma.product.count({ where: { storeId: { in: storeIds }, isPublished: true } }),
    ]);

    return {
      revenue: Number(revenue._sum.total || 0),
      orders,
      pendingOrders,
      products,
    };
  }

  private async getSupplierStats(storeId?: string) {
    const where: any = storeId ? { storeId } : {};

    const [pending, shipped, delivered] = await Promise.all([
      this.prisma.supplierOrder.count({ where: { status: 'PENDING', ...where } }),
      this.prisma.supplierOrder.count({ where: { status: 'SHIPPED', ...where } }),
      this.prisma.supplierOrder.count({ where: { status: 'DELIVERED', ...where } }),
    ]);

    return {
      pendingOrders: pending,
      shippedOrders: shipped,
      deliveredOrders: delivered,
    };
  }

  async getUnifiedOrders(userId?: string, storeId?: string, status?: string) {
    const storeIds = storeId ? [storeId] : [];

    if (!storeId && userId) {
      const stores = await this.prisma.store.findMany({
        where: { ownerId: userId },
        select: { id: true },
      });
      storeIds.push(...stores.map((s) => s.id));
    }

    const where: any = { storeId: storeIds.length ? { in: storeIds } : undefined };
    if (status) where.status = status;

    const [ecomerceOrders, shopifyOrders, supplierOrders] = await Promise.all([
      this.prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          createdAt: true,
          paymentStatus: true,
          customerEmail: true,
          customerPhone: true,
          store: { select: { id: true, name: true, slug: true } },
          items: {
            select: {
              id: true,
              quantity: true,
              price: true,
              title: true,
              imageUrl: true,
              product: { select: { id: true, title: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.autoFulfillmentService.getSyncedOrders(storeId),
      this.prisma.supplierOrder.findMany({
        where: { storeId: storeId || undefined },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    return {
      ecommerce: ecomerceOrders,
      shopify: shopifyOrders,
      suppliers: supplierOrders,
    };
  }

  async getInventoryStatus(storeId?: string) {
    const where = storeId ? { storeId } : {};

    const [lowStock, outOfStock, totalProducts] = await Promise.all([
      this.prisma.product.findMany({
        where: { ...where, trackInventory: true, inventory: { lte: 10, gt: 0 } },
        select: { id: true, title: true, inventory: true, sku: true },
        take: 20,
      }),
      this.prisma.product.findMany({
        where: { ...where, trackInventory: true, inventory: { lte: 0 } },
        select: { id: true, title: true, inventory: true, sku: true },
        take: 20,
      }),
      this.prisma.product.count({ where: { ...where, isPublished: true } }),
    ]);

    return {
      totalProducts,
      lowStock: lowStock.length,
      outOfStock: outOfStock.length,
      lowStockProducts: lowStock,
      outOfStockProducts: outOfStock,
    };
  }

  async getRevenueByDay(storeId: string, days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const orders = await this.prisma.order.findMany({
      where: {
        storeId,
        paymentStatus: 'PAID',
        createdAt: { gte: startDate },
      },
      select: { total: true, createdAt: true },
    });

    const revenueByDay: { [key: string]: number } = {};

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      revenueByDay[key] = 0;
    }

    for (const order of orders) {
      const key = order.createdAt.toISOString().split('T')[0];
      if (revenueByDay[key] !== undefined) {
        revenueByDay[key] += Number(order.total);
      }
    }

    return Object.entries(revenueByDay)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
