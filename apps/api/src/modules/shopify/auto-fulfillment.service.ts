import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { ShopifyService } from './shopify.service';
import { SuppliersService } from '../suppliers/suppliers.service';

interface ShopifyLineItem {
  id: number;
  title: string;
  quantity: number;
  price: string;
  sku: string;
  variant_id: number;
  product_id: number;
}

interface FulfillmentResult {
  success: boolean;
  orderId: string;
  supplierOrders: string[];
  error?: string;
}

@Injectable()
export class AutoFulfillmentService {
  private readonly logger = new Logger(AutoFulfillmentService.name);

  constructor(
    private prisma: PrismaService,
    private shopifyService: ShopifyService,
    private suppliersService: SuppliersService
  ) {}

  async processNewOrder(shopifyOrder: any): Promise<FulfillmentResult> {
    const shopifyOrderId = shopifyOrder.id;
    const orderNumber = shopifyOrder.order_number;
    const customerEmail = shopifyOrder.email;
    const lineItems = shopifyOrder.line_items as ShopifyLineItem[];

    this.logger.log(`Processing new order ${orderNumber} with ${lineItems.length} items`);

    const existingSync = await this.prisma.shopifyOrderSync.findUnique({
      where: { shopifyOrderId: String(shopifyOrderId) },
    });

    if (existingSync) {
      this.logger.log(`Order ${orderNumber} already processed`);
      return {
        success: true,
        orderId: existingSync.id,
        supplierOrders: [],
      };
    }

    const supplierOrders: string[] = [];

    for (const item of lineItems) {
      try {
        const result = await this.createSupplierOrder(item, shopifyOrder);
        if (result.success && result.supplierOrderId) {
          supplierOrders.push(result.supplierOrderId);
        }
      } catch (error) {
        this.logger.error(`Failed to create supplier order for item ${item.id}`, error);
      }
    }

    const syncRecord = await this.prisma.shopifyOrderSync.create({
      data: {
        shopifyOrderId: String(shopifyOrderId),
        orderNumber: String(orderNumber),
        customerEmail,
        status: 'PENDING',
        totalAmount: parseFloat(shopifyOrder.total_price || '0'),
        currency: shopifyOrder.currency || 'USD',
        lineItemsJson: JSON.stringify(lineItems),
        supplierOrderIds: supplierOrders,
      },
    });

    this.logger.log(
      `Order ${orderNumber} synced successfully. Supplier orders: ${supplierOrders.length}`
    );

    return {
      success: true,
      orderId: syncRecord.id,
      supplierOrders,
    };
  }

  private async createSupplierOrder(
    item: ShopifyLineItem,
    shopifyOrder: any
  ): Promise<{ success: boolean; supplierOrderId?: string; error?: string }> {
    const sku = item.sku || `SHOPIFY-${item.product_id}`;

    const existingProduct = await this.prisma.product.findFirst({
      where: { sku },
      include: { store: { include: { owner: true } } },
    });

    if (!existingProduct) {
      this.logger.warn(`Product with SKU ${sku} not found in database`);
      return { success: false, error: 'Product not found' };
    }

    const supplierOrder = await this.prisma.supplierOrder.create({
      data: {
        supplierId: existingProduct.supplierId || '',
        storeId: existingProduct.storeId,
        externalOrderId: `SHOPIFY-${shopifyOrder.id}-${item.id}`,
        customerName: shopifyOrder.shipping_address?.name || 'Customer',
        customerEmail: shopifyOrder.email,
        shippingAddress: JSON.stringify(shopifyOrder.shipping_address),
        status: 'PENDING',
        items: JSON.stringify([
          {
            productId: existingProduct.id,
            quantity: item.quantity,
            price: parseFloat(item.price),
          },
        ]),
        totalCost: parseFloat(item.price) * item.quantity,
        notes: `Auto-created from Shopify order ${shopifyOrder.order_number}`,
      },
    });

    return {
      success: true,
      supplierOrderId: supplierOrder.id,
    };
  }

  async processFulfillmentUpdate(shopifyOrder: any): Promise<void> {
    const shopifyOrderId = String(shopifyOrder.id);

    const syncRecord = await this.prisma.shopifyOrderSync.findUnique({
      where: { shopifyOrderId },
    });

    if (!syncRecord) {
      this.logger.warn(`No sync record found for order ${shopifyOrderId}`);
      return;
    }

    const fulfillmentStatus = shopifyOrder.fulfillment_status;

    let newStatus = 'PENDING';
    if (fulfillmentStatus === 'fulfilled') {
      newStatus = 'FULFILLED';
    } else if (fulfillmentStatus === 'partial') {
      newStatus = 'PARTIALLY_FULFILLED';
    }

    await this.prisma.shopifyOrderSync.update({
      where: { id: syncRecord.id },
      data: { status: newStatus },
    });

    this.logger.log(`Updated order ${syncRecord.orderNumber} status to ${newStatus}`);
  }

  async getSyncedOrders(storeId?: string): Promise<any[]> {
    const where = storeId ? { storeId } : {};

    return this.prisma.shopifyOrderSync.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStats(storeId?: string): Promise<any> {
    const where = storeId ? { storeId } : {};

    const [total, pending, fulfilled, revenue] = await Promise.all([
      this.prisma.shopifyOrderSync.count({ where }),
      this.prisma.shopifyOrderSync.count({ where: { status: 'PENDING' } }),
      this.prisma.shopifyOrderSync.count({ where: { status: 'FULFILLED' } }),
      this.prisma.shopifyOrderSync.aggregate({
        where,
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      totalOrders: total,
      pendingOrders: pending,
      fulfilledOrders: fulfilled,
      totalRevenue: revenue._sum.totalAmount || 0,
      fulfillmentRate: total > 0 ? Math.round((fulfilled / total) * 100) : 0,
    };
  }
}
