import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../config/prisma.service';
import * as crypto from 'crypto';

export interface ShopifyOrder {
  id: number;
  order_number: number;
  email: string;
  total_price: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  created_at: string;
  line_items: ShopifyLineItem[];
  shipping_address?: any;
  customer?: any;
}

export interface ShopifyLineItem {
  id: number;
  title: string;
  quantity: number;
  price: string;
  sku: string;
  variant_id: number;
  product_id: number;
}

export interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  handle: string;
  status: string;
  variants: any[];
  images: any[];
  created_at: string;
  updated_at: string;
}

export interface ShopifyLocation {
  id: number;
  name: string;
  address1: string;
  city: string;
  country: string;
}

@Injectable()
export class ShopifyService {
  private readonly logger = new Logger(ShopifyService.name);
  private readonly storeUrl: string;
  private readonly apiKey: string;
  private readonly accessToken: string;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService
  ) {
    this.storeUrl = this.config.get('SHOPIFY_STORE_URL') || '';
    this.apiKey = this.config.get('SHOPIFY_API_KEY') || '';
    this.accessToken = this.config.get('SHOPIFY_ACCESS_TOKEN') || '';
  }

  private async shopifyFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `https://${this.storeUrl}/admin/api/2024-01${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': this.accessToken,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Shopify API error: ${response.status} - ${error}`);
      throw new Error(`Shopify API error: ${response.status}`);
    }

    return response.json();
  }

  async getOrders(status: string = 'any', limit: number = 50): Promise<ShopifyOrder[]> {
    try {
      const data = await this.shopifyFetch<any>(`/orders.json?status=${status}&limit=${limit}`);
      return data.orders || [];
    } catch (error) {
      this.logger.error('Failed to fetch orders', error);
      return [];
    }
  }

  async getOrder(orderId: number): Promise<ShopifyOrder | null> {
    try {
      const data = await this.shopifyFetch<any>(`/orders/${orderId}.json`);
      return data.order || null;
    } catch (error) {
      this.logger.error(`Failed to fetch order ${orderId}`, error);
      return null;
    }
  }

  async getProducts(limit: number = 50): Promise<ShopifyProduct[]> {
    try {
      const data = await this.shopifyFetch<any>(`/products.json?limit=${limit}`);
      return data.products || [];
    } catch (error) {
      this.logger.error('Failed to fetch products', error);
      return [];
    }
  }

  async getProduct(productId: number): Promise<ShopifyProduct | null> {
    try {
      const data = await this.shopifyFetch<any>(`/products/${productId}.json`);
      return data.product || null;
    } catch (error) {
      this.logger.error(`Failed to fetch product ${productId}`, error);
      return null;
    }
  }

  async createProduct(product: {
    title: string;
    body_html?: string;
    vendor?: string;
    product_type?: string;
    variants?: any[];
    images?: any[];
  }): Promise<ShopifyProduct | null> {
    try {
      const data = await this.shopifyFetch<any>('/products.json', {
        method: 'POST',
        body: JSON.stringify({ product }),
      });
      return data.product || null;
    } catch (error) {
      this.logger.error('Failed to create product', error);
      return null;
    }
  }

  async updateProduct(productId: number, product: any): Promise<ShopifyProduct | null> {
    try {
      const data = await this.shopifyFetch<any>(`/products/${productId}.json`, {
        method: 'PUT',
        body: JSON.stringify({ product }),
      });
      return data.product || null;
    } catch (error) {
      this.logger.error(`Failed to update product ${productId}`, error);
      return null;
    }
  }

  async fulfillOrder(
    orderId: number,
    locationId: number,
    trackingCompany?: string,
    trackingNumbers?: string[]
  ): Promise<boolean> {
    try {
      const fulfillment = {
        location_id: locationId,
        notify_customer: true,
        tracking_company: trackingCompany || 'Other',
        tracking_numbers: trackingNumbers || [],
      };

      await this.shopifyFetch<any>(`/orders/${orderId}/fulfillments.json`, {
        method: 'POST',
        body: JSON.stringify({ fulfillment }),
      });

      return true;
    } catch (error) {
      this.logger.error(`Failed to fulfill order ${orderId}`, error);
      return false;
    }
  }

  async getLocations(): Promise<ShopifyLocation[]> {
    try {
      const data = await this.shopifyFetch<any>('/locations.json');
      return data.locations || [];
    } catch (error) {
      this.logger.error('Failed to fetch locations', error);
      return [];
    }
  }

  async getInventoryLevels(inventoryItemIds: number[]): Promise<any[]> {
    if (inventoryItemIds.length === 0) return [];

    try {
      const ids = inventoryItemIds.join(',');
      const data = await this.shopifyFetch<any>(`/inventory_levels.json?inventory_item_ids=${ids}`);
      return data.inventory_levels || [];
    } catch (error) {
      this.logger.error('Failed to fetch inventory levels', error);
      return [];
    }
  }

  async updateInventory(
    inventoryItemId: number,
    locationId: number,
    adjustment: number
  ): Promise<boolean> {
    try {
      await this.shopifyFetch<any>('/inventory_levels/adjust.json', {
        method: 'POST',
        body: JSON.stringify({
          inventory_item_id: inventoryItemId,
          location_id: locationId,
          available_adjustment: adjustment,
        }),
      });
      return true;
    } catch (error) {
      this.logger.error('Failed to update inventory', error);
      return false;
    }
  }

  getStoreUrl(): string {
    return this.storeUrl;
  }

  verifyWebhookSignature(body: string, hmacHeader: string): boolean {
    const secret = this.config.get('SHOPIFY_API_SECRET') || '';
    const hash = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('base64');
    return hash === hmacHeader;
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
      // Fetch ALL products from Shopify (paginate to get all)
      let allProducts: ShopifyProduct[] = [];
      let page = 1;
      const limit = 250;

      while (true) {
        const endpoint = `/products.json?limit=${limit}&page=${page}`;
        try {
          const data = await this.shopifyFetch<any>(endpoint);
          const batch = data.products || [];
          if (batch.length === 0) break;
          allProducts = allProducts.concat(batch);
          if (batch.length < limit) break;
          page++;
        } catch {
          break;
        }
      }

      result.total = allProducts.length;

      for (const sp of allProducts) {
        try {
          // Check if already imported
          const existing = await this.prisma.shopifyProductMapping.findUnique({
            where: { shopifyProductId_storeId: { shopifyProductId: sp.id, storeId } },
          });

          if (existing) {
            // Update existing mapping timestamp
            await this.prisma.shopifyProductMapping.update({
              where: { id: existing.id },
              data: { lastSyncedAt: new Date(), syncStatus: 'SYNCED' },
            });

            // Update the linked product if it exists
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

          // Map Shopify product to our Product model
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

          // Create mapping
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
