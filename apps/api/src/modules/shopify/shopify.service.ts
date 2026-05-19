import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

  constructor(private config: ConfigService) {
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
}
