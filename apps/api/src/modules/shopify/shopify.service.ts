import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface ShopifyAddress {
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  zip?: string;
  country?: string;
  phone?: string;
  name?: string;
  company?: string;
}

export interface ShopifyCustomer {
  id: number;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

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
  shipping_address?: ShopifyAddress;
  customer?: ShopifyCustomer;
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

export interface ShopifyVariant {
  id: number;
  title: string;
  price: string;
  sku: string;
  inventory_item_id: number;
  inventory_quantity: number;
  compare_at_price?: string;
  barcode?: string;
}

export interface ShopifyImage {
  id: number;
  src: string;
  alt?: string;
  position?: number;
}

export interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  handle: string;
  status: string;
  variants: ShopifyVariant[];
  images: ShopifyImage[];
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
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly shop: string;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(private config: ConfigService) {
    this.storeUrl = this.config.get('SHOPIFY_STORE_URL') || '';
    this.clientId = this.config.get('SHOPIFY_API_KEY') || '';
    this.clientSecret = this.config.get('SHOPIFY_API_SECRET') || '';
    this.shop = this.storeUrl.replace('.myshopify.com', '');
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60_000) {
      return this.accessToken;
    }

    const response = await fetch(`https://${this.storeUrl}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`Shopify OAuth token request failed: ${response.status} - ${text}`);
      throw new Error(`Shopify OAuth token request failed: ${response.status}`);
    }

    const { access_token, expires_in } = await response.json();
    this.accessToken = access_token;
    this.tokenExpiresAt = Date.now() + (expires_in || 86400) * 1000;
    this.logger.log('Shopify OAuth token refreshed');
    return access_token;
  }

  private async shopifyFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `https://${this.storeUrl}/admin/api/2024-01${endpoint}`;
    const token = await this.getAccessToken();

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
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
      const data = await this.shopifyFetch<{ orders: ShopifyOrder[] }>(`/orders.json?status=${status}&limit=${limit}`);
      return data.orders || [];
    } catch (error) {
      this.logger.error('Failed to fetch orders', error);
      return [];
    }
  }

  async getOrder(orderId: number): Promise<ShopifyOrder | null> {
    try {
      const data = await this.shopifyFetch<{ order: ShopifyOrder }>(`/orders/${orderId}.json`);
      return data.order || null;
    } catch (error) {
      this.logger.error(`Failed to fetch order ${orderId}`, error);
      return null;
    }
  }

  async getProducts(limit: number = 50): Promise<ShopifyProduct[]> {
    try {
      const data = await this.shopifyFetch<{ products: ShopifyProduct[] }>(`/products.json?limit=${limit}`);
      return data.products || [];
    } catch (error) {
      this.logger.error('Failed to fetch products', error);
      return [];
    }
  }

  async getProduct(productId: number): Promise<ShopifyProduct | null> {
    try {
      const data = await this.shopifyFetch<{ product: ShopifyProduct }>(`/products/${productId}.json`);
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
    variants?: ShopifyVariant[];
    images?: ShopifyImage[];
  }): Promise<ShopifyProduct | null> {
    try {
      const data = await this.shopifyFetch<{ product: ShopifyProduct }>('/products.json', {
        method: 'POST',
        body: JSON.stringify({ product }),
      });
      return data.product || null;
    } catch (error) {
      this.logger.error('Failed to create product', error);
      return null;
    }
  }

  async updateProduct(productId: number, product: Partial<ShopifyProduct>): Promise<ShopifyProduct | null> {
    try {
      const data = await this.shopifyFetch<{ product: ShopifyProduct }>(`/products/${productId}.json`, {
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

      await this.shopifyFetch<{ fulfillment: Record<string, unknown> }>(`/orders/${orderId}/fulfillments.json`, {
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
      const data = await this.shopifyFetch<{ locations: ShopifyLocation[] }>('/locations.json');
      return data.locations || [];
    } catch (error) {
      this.logger.error('Failed to fetch locations', error);
      return [];
    }
  }

  async getInventoryLevels(inventoryItemIds: number[]): Promise<Record<string, unknown>[]> {
    if (inventoryItemIds.length === 0) return [];

    try {
      const ids = inventoryItemIds.join(',');
      const data = await this.shopifyFetch<{ inventory_levels: Record<string, unknown>[] }>(`/inventory_levels.json?inventory_item_ids=${ids}`);
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
      await this.shopifyFetch<Record<string, unknown>>('/inventory_levels/adjust.json', {
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
