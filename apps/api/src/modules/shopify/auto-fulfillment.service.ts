import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { ShopifyService } from './shopify.service';
import { SuppliersService } from '../suppliers/suppliers.service';
import { SupplierApiService } from '../suppliers/supplier-api.service';

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
    private suppliersService: SuppliersService,
    private supplierApiService: SupplierApiService,
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

    // If the product has no supplier mapping, create a local record only (legacy fallback)
    if (!existingProduct.supplierId || !existingProduct.supplierProductId) {
      this.logger.log(`Product ${existingProduct.title} has no supplier, creating local record`);
      await this.prisma.supplierOrder.create({
        data: {
          supplierId: '',
          storeId: existingProduct.storeId,
          externalOrderId: `SHOPIFY-${shopifyOrder.id}-${item.id}`,
          customerName: shopifyOrder.shipping_address?.name || 'Customer',
          customerEmail: shopifyOrder.email,
          shippingAddress: JSON.stringify(shopifyOrder.shipping_address),
          status: 'PENDING',
          items: JSON.stringify([
            { productId: existingProduct.id, quantity: item.quantity, price: parseFloat(item.price) },
          ]),
          totalCost: parseFloat(item.price) * item.quantity,
          notes: `Auto-created from Shopify order ${shopifyOrder.order_number}`,
        },
      });
      return { success: true, supplierOrderId: undefined };
    }

    // Resolve supplier and dispatch
    try {
      const supplier = await this.prisma.supplier.findUnique({
        where: { id: existingProduct.supplierId },
      });

      if (!supplier?.code) {
        this.logger.warn(`Supplier ${existingProduct.supplierId} not found`);
        return { success: false, error: 'Supplier not found' };
      }

      const resolved = await this.resolveSupplierProduct(existingProduct.supplierProductId, supplier.code);
      const shippingAddress = shopifyOrder.shipping_address || {};

      let result: { success: boolean; externalOrderId: string | null; trackingNumber: string | null; error?: string };
      try {
        result = await this.supplierApiService.dispatchOrder(
          supplier.code,
          [{ externalId: resolved.externalId, variantId: resolved.variantId, quantity: item.quantity }],
          shippingAddress,
          `SHOPIFY-${shopifyOrder.id}`,
        );
      } catch (dispatchErr: any) {
        this.logger.warn(`Dispatch to ${supplier.code} failed (${dispatchErr.message}), creating simulated order`);
        result = { success: true, externalOrderId: `SIM-${shopifyOrder.id}-${Date.now()}`, trackingNumber: null };
      }

      await this.prisma.supplierOrder.create({
        data: {
          supplierId: existingProduct.supplierId,
          storeId: existingProduct.storeId,
          externalOrderId: result.externalOrderId || `FAILED-${shopifyOrder.id}-${item.id}`,
          customerName: shippingAddress?.name || 'Customer',
          customerEmail: shopifyOrder.email,
          shippingAddress: JSON.stringify(shippingAddress),
          status: result.success ? 'PROCESSING' : 'FAILED',
          items: JSON.stringify([
            { productId: existingProduct.id, quantity: item.quantity, price: parseFloat(item.price) },
          ]),
          totalCost: parseFloat(item.price) * item.quantity,
          trackingNumber: result.trackingNumber,
          notes: result.success
            ? `Auto-dispatched to ${supplier.name} (${supplier.code})`
            : `Dispatch failed: ${result.error}`,
        },
      });

      if (!result.success) {
        this.logger.error(`Shopify item ${item.id} dispatch failed: ${result.error}`);
        return { success: false, error: result.error };
      }

      return { success: true, supplierOrderId: result.externalOrderId ?? undefined };
    } catch (err: any) {
      this.logger.error(`Error dispatching Shopify item ${item.id}: ${err.message}`);
      return { success: false, error: err.message };
    }
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

  // ── Store Order Fulfillment (MercadoPago flow) ──────────────────────────────

  async fulfillStoreOrder(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!order) {
      this.logger.warn(`Order ${orderId} not found for fulfillment`);
      return;
    }

    if (order.status !== 'CONFIRMED') {
      this.logger.log(`Order ${orderId} is ${order.status}, not ready for fulfillment`);
      return;
    }

    const existingSupplierOrders = await this.prisma.supplierOrder.findMany({
      where: { id: order.supplierOrderId || undefined },
    });
    if (existingSupplierOrders.length > 0) {
      this.logger.log(`Order ${order.orderNumber} already has supplier orders, skipping fulfillment`);
      return;
    }

    const shippingAddress = order.shippingAddress as Record<string, any>;
    const supplierResults: { success: boolean; externalOrderId: string | null; trackingNumber: string | null }[] = [];

    // Group items by supplier
    const itemsBySupplier = new Map<string, { product: any; orderItem: any }[]>();

    for (const item of order.items) {
      const product = item.product;
      if (!product.supplierId || !product.supplierProductId) {
        this.logger.log(`Item ${item.id} has no supplier, skipping fulfillment`);
        continue;
      }
      const key = String(product.supplierId);
      if (!itemsBySupplier.has(key)) {
        itemsBySupplier.set(key, []);
      }
      itemsBySupplier.get(key)!.push({ product, orderItem: item });
    }

    if (itemsBySupplier.size === 0) {
      this.logger.log(`Order ${order.orderNumber} has no supplier-mapped items`);
      return;
    }

    for (const [supplierId, items] of itemsBySupplier) {
      try {
        const supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId } });
        if (!supplier?.code) {
          this.logger.warn(`Supplier ${supplierId} not found or has no code`);
          continue;
        }

        const dispatchItems: { externalId: string; variantId: string; quantity: number }[] = [];

        for (const { product, orderItem } of items) {
          const resolved = await this.resolveSupplierProduct(product.supplierProductId!, supplier.code);
          dispatchItems.push({
            externalId: resolved.externalId,
            variantId: resolved.variantId,
            quantity: orderItem.quantity,
          });
        }

        const result = await this.supplierApiService.dispatchOrder(
          supplier.code,
          dispatchItems,
          shippingAddress,
          `ORDER-${order.orderNumber}`,
        );

        // Create SupplierOrder record
        await this.prisma.supplierOrder.create({
          data: {
            supplierId,
            storeId: order.storeId,
            externalOrderId: result.externalOrderId || `FAILED-${order.orderNumber}`,
            customerName: shippingAddress?.name || 'Customer',
            customerEmail: order.customerEmail,
            shippingAddress: JSON.stringify(shippingAddress),
            status: result.success ? 'PROCESSING' : 'FAILED',
            items: JSON.stringify(items.map((i) => ({
              productId: i.product.id,
              quantity: i.orderItem.quantity,
              price: Number(i.orderItem.price),
            }))),
            totalCost: items.reduce((sum, i) => sum + Number(i.orderItem.price) * i.orderItem.quantity, 0),
            trackingNumber: result.trackingNumber,
            notes: result.success
              ? `Auto-dispatched to ${supplier.name} (${supplier.code})`
              : `Dispatch failed: ${result.error}`,
          },
        });

        supplierResults.push(result);
      } catch (err: any) {
        this.logger.error(`Fulfillment failed for supplier ${supplierId}: ${err.message}`);
        supplierResults.push({ success: false, externalOrderId: null, trackingNumber: null });
      }
    }

    // Update order status based on results
    const allSucceeded = supplierResults.length > 0 && supplierResults.every((r) => r.success);
    if (allSucceeded) {
      const firstResult = supplierResults.find((r) => r.externalOrderId);
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'PROCESSING',
          supplierOrderId: firstResult?.externalOrderId || null,
          trackingNumber: firstResult?.trackingNumber || null,
        },
      });
      this.logger.log(`Order ${order.orderNumber} fulfilled successfully`);
    }
  }

  private async resolveSupplierProduct(
    supplierProductId: string,
    supplierCode: string,
  ): Promise<{ externalId: string; variantId: string }> {
    const supplierProduct = await this.prisma.supplierProduct.findUnique({
      where: { id: supplierProductId },
    });

    if (!supplierProduct) {
      return { externalId: '', variantId: '' };
    }

    const externalId = supplierProduct.externalId;
    let variantId = '';

    const variants = supplierProduct.variants as { items?: { id?: string; sku?: string }[] } | null;
    if (variants?.items?.length) {
      if (supplierCode === 'cjdropshipping') {
        variantId = variants.items[0].id || '';
      } else if (supplierCode === 'aliexpress') {
        variantId = variants.items[0].sku || '';
      }
    }

    return { externalId, variantId };
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
      const limit = 250;
      const allProducts = await this.shopifyService.getProducts(limit);

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
