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

  async importProducts(storeId: string): Promise<{
    imported: number;
    skipped: number;
    total: number;
    products: { id: string; title: string; shopifyId: number }[];
    errors: string[];
  }> {
    const result = { imported: 0, skipped: 0, total: 0, products: [] as any[], errors: [] as string[] };

    try {
      let allProducts: any[] = [];
      let page = 1;
      const limit = 250;

      while (true) {
        const data = await this.shopifyService.getProducts(limit);
        if (data.length === 0) break;
        allProducts = allProducts.concat(data);
        if (data.length < limit) break;
        page++;
        // Manual pagination via offset (Shopify REST API uses page param)
        // but getProducts only accepts limit, so we'll just fetch max 250
        break;
      }

      result.total = allProducts.length;

      for (const sp of allProducts) {
        try {
          const existing = await this.prisma.shopifyProductMapping.findUnique({
            where: { shopifyProductId_storeId: { shopifyProductId: sp.id, storeId } },
          });

          if (existing) {
            await this.prisma.shopifyProductMapping.update({
              where: { id: existing.id },
              data: { lastSyncedAt: new Date(), syncStatus: 'SYNCED' },
            });

            if (existing.ecomerceProductId) {
              const variant = sp.variants?.[0] || {};
              await this.prisma.product.update({
                where: { id: existing.ecomerceProductId },
                data: {
                  title: sp.title,
                  description: sp.body_html || '',
                  price: variant.price ? parseFloat(variant.price) : 0,
                  compareAtPrice: variant.compare_at_price ? parseFloat(variant.compare_at_price) : null,
                  sku: variant.sku || null,
                  barcode: variant.barcode || null,
                  images: (sp.images || []).map((i: any) => i.src).filter(Boolean),
                  category: sp.product_type || null,
                  inventory: variant.inventory_quantity || 0,
                  isPublished: sp.status === 'active',
                  updatedAt: new Date(),
                },
              });
            }
            result.skipped++;
            continue;
          }

          const variant = sp.variants?.[0] || {};

          const product = await this.prisma.product.create({
            data: {
              title: sp.title,
              description: sp.body_html || '',
              price: variant.price ? parseFloat(variant.price) : 0,
              compareAtPrice: variant.compare_at_price ? parseFloat(variant.compare_at_price) : null,
              costPrice: 0,
              sku: variant.sku || null,
              barcode: variant.barcode || null,
              images: (sp.images || []).map((i: any) => i.src).filter(Boolean),
              category: sp.product_type || null,
              tags: sp.handle ? [sp.handle] : [],
              inventory: variant.inventory_quantity || 0,
              isPublished: sp.status === 'active',
              storeId: storeId,
            },
          });

          await this.prisma.shopifyProductMapping.create({
            data: {
              shopifyProductId: sp.id,
              ecomerceProductId: product.id,
              storeId: storeId,
            },
          });

          result.products.push({ id: product.id, title: sp.title, shopifyId: sp.id });
          result.imported++;
        } catch (err: any) {
          result.errors.push(`Product ${sp.title}: ${err.message}`);
        }
      }
    } catch (err: any) {
      this.logger.error('Failed to import products', err);
      result.errors.push(`Fatal: ${err.message}`);
    }

    return result;
  }
}
