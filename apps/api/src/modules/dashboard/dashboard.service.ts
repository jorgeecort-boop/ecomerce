import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { StoreAccessService } from '../stores/store-access.service';

export interface DashboardStats {
  overview: {
    totalRevenue: number;
    totalOrders: number;
    totalProducts: number;
    totalStores: number;
  };
  revenueByDay: { date: string; revenue: number }[];
  topProducts: { id: string; title: string; orders: number; revenue: number }[];
  ordersByStatus: { status: string; count: number }[];
  recentOrders: any[];
  lowStockProducts: { id: string; title: string; inventory: number }[];
}

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private storeAccess: StoreAccessService,
  ) {}

  async getStoreStats(storeId: string): Promise<DashboardStats> {
    const [orders, products, totalRevenue, totalOrders, lowStock] = await Promise.all([
      this.prisma.order.findMany({
        where: { storeId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          items: true,
        },
      }),
      this.prisma.product.findMany({
        where: { storeId },
      }),
      this.prisma.order.aggregate({
        where: { storeId, paymentStatus: 'PAID' },
        _sum: { total: true },
      }),
      this.prisma.order.count({
        where: { storeId },
      }),
      this.prisma.product.findMany({
        where: {
          storeId,
          trackInventory: true,
          inventory: { lte: 10 },
        },
        take: 5,
      }),
    ]);

    const totalProducts = products.length;
    const revenue = Number(totalRevenue._sum.total || 0);

    const revenueByDay = await this.getRevenueByDay(storeId);
    const topProducts = await this.getTopProducts(storeId);
    const ordersByStatus = await this.getOrdersByStatus(storeId);

    return {
      overview: {
        totalRevenue: revenue,
        totalOrders,
        totalProducts,
        totalStores: 1,
      },
      revenueByDay,
      topProducts,
      ordersByStatus,
      recentOrders: orders,
      lowStockProducts: lowStock.map((p: any) => ({
        id: p.id,
        title: p.title,
        inventory: p.inventory,
      })),
    };
  }

  async getUserStats(userId: string): Promise<DashboardStats> {
    const storeIds = await this.storeAccess.getUserStoreIds(userId);

    if (storeIds.length === 0) {
      return {
        overview: {
          totalRevenue: 0,
          totalOrders: 0,
          totalProducts: 0,
          totalStores: 0,
        },
        revenueByDay: [],
        topProducts: [],
        ordersByStatus: [],
        recentOrders: [],
        lowStockProducts: [],
      };
    }

    const [orders, products, totalRevenue, totalOrders, lowStock] = await Promise.all([
      this.prisma.order.findMany({
        where: { storeId: { in: storeIds } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          items: true,
        },
      }),
      this.prisma.product.findMany({
        where: { storeId: { in: storeIds } },
      }),
      this.prisma.order.aggregate({
        where: { storeId: { in: storeIds }, paymentStatus: 'PAID' },
        _sum: { total: true },
      }),
      this.prisma.order.count({
        where: { storeId: { in: storeIds } },
      }),
      this.prisma.product.findMany({
        where: {
          storeId: { in: storeIds },
          trackInventory: true,
          inventory: { lte: 10 },
        },
        take: 5,
      }),
    ]);

    const totalProducts = products.length;
    const revenue = Number(totalRevenue._sum.total || 0);

    const revenueByDay = await this.getRevenueByDays(storeIds);
    const topProducts = await this.getTopProductsByStores(storeIds);
    const ordersByStatus = await this.getOrdersByStatusByStores(storeIds);

    return {
      overview: {
        totalRevenue: revenue,
        totalOrders,
        totalProducts,
        totalStores: storeIds.length,
      },
      revenueByDay,
      topProducts,
      ordersByStatus,
      recentOrders: orders,
      lowStockProducts: lowStock.map((p: any) => ({
        id: p.id,
        title: p.title,
        inventory: p.inventory,
      })),
    };
  }

  private async getRevenueByDay(storeId: string): Promise<{ date: string; revenue: number }[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const orders = await this.prisma.order.findMany({
      where: {
        storeId,
        paymentStatus: 'PAID',
        createdAt: { gte: sevenDaysAgo },
      },
      select: {
        total: true,
        createdAt: true,
      },
    });

    const revenueMap = new Map<string, number>();

    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      revenueMap.set(key, 0);
    }

    for (const order of orders) {
      const key = order.createdAt.toISOString().split('T')[0];
      revenueMap.set(key, (revenueMap.get(key) || 0) + Number(order.total));
    }

    return Array.from(revenueMap.entries())
      .map(([date, revenue]: [string, number]) => ({ date, revenue }))
      .sort((a: any, b: any) => a.date.localeCompare(b.date));
  }

  private async getRevenueByDays(storeIds: string[]): Promise<{ date: string; revenue: number }[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const orders = await this.prisma.order.findMany({
      where: {
        storeId: { in: storeIds },
        paymentStatus: 'PAID',
        createdAt: { gte: sevenDaysAgo },
      },
      select: {
        total: true,
        createdAt: true,
      },
    });

    const revenueMap = new Map<string, number>();

    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      revenueMap.set(key, 0);
    }

    for (const order of orders) {
      const key = order.createdAt.toISOString().split('T')[0];
      revenueMap.set(key, (revenueMap.get(key) || 0) + Number(order.total));
    }

    return Array.from(revenueMap.entries())
      .map(([date, revenue]: [string, number]) => ({ date, revenue }))
      .sort((a: any, b: any) => a.date.localeCompare(b.date));
  }

  private async getTopProducts(
    storeId: string
  ): Promise<{ id: string; title: string; orders: number; revenue: number }[]> {
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        order: { storeId, paymentStatus: 'PAID' },
      },
      include: { product: true },
    });

    const productMap = new Map<
      string,
      { id: string; title: string; orders: number; revenue: number }
    >();

    for (const item of orderItems) {
      const existing = productMap.get(item.productId);
      if (existing) {
        existing.orders += item.quantity;
        existing.revenue += Number(item.total);
      } else {
        productMap.set(item.productId, {
          id: item.productId,
          title: item.title,
          orders: item.quantity,
          revenue: Number(item.total),
        });
      }
    }

    return Array.from(productMap.values())
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 5);
  }

  private async getTopProductsByStores(
    storeIds: string[]
  ): Promise<{ id: string; title: string; orders: number; revenue: number }[]> {
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        order: { storeId: { in: storeIds }, paymentStatus: 'PAID' },
      },
      include: { product: true },
    });

    const productMap = new Map<
      string,
      { id: string; title: string; orders: number; revenue: number }
    >();

    for (const item of orderItems) {
      const existing = productMap.get(item.productId);
      if (existing) {
        existing.orders += item.quantity;
        existing.revenue += Number(item.total);
      } else {
        productMap.set(item.productId, {
          id: item.productId,
          title: item.title,
          orders: item.quantity,
          revenue: Number(item.total),
        });
      }
    }

    return Array.from(productMap.values())
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 5);
  }

  private async getOrdersByStatus(storeId: string): Promise<{ status: string; count: number }[]> {
    const orders = await this.prisma.order.groupBy({
      by: ['status'],
      where: { storeId },
      _count: { id: true },
    });

    return orders.map((o: any) => ({
      status: o.status,
      count: o._count.id,
    }));
  }

  private async getOrdersByStatusByStores(
    storeIds: string[]
  ): Promise<{ status: string; count: number }[]> {
    const orders = await this.prisma.order.groupBy({
      by: ['status'],
      where: { storeId: { in: storeIds } },
      _count: { id: true },
    });

    return orders.map((o: any) => ({
      status: o.status,
      count: o._count.id,
    }));
  }
}
