import { ShopifyOrder, ShopifyProduct } from '../shopify.service';

export interface IShopifyIntegrationService {
  getOrders(status?: string, limit?: number): Promise<ShopifyOrder[]>;
  getOrder(orderId: number): Promise<ShopifyOrder | null>;
  getProducts(limit?: number): Promise<ShopifyProduct[]>;
  getProduct(productId: number): Promise<ShopifyProduct | null>;
  createProduct(product: {
    title: string;
    body_html?: string;
    vendor?: string;
    product_type?: string;
    variants?: any[];
    images?: any[];
  }): Promise<ShopifyProduct | null>;
  updateProduct(productId: number, product: any): Promise<ShopifyProduct | null>;
  fulfillOrder(
    orderId: number,
    locationId: number,
    trackingCompany?: string,
    trackingNumbers?: string[]
  ): Promise<boolean>;
  getLocations(): Promise<any[]>;
  getInventoryLevels(inventoryItemIds: number[]): Promise<any[]>;
  updateInventory(
    inventoryItemId: number,
    locationId: number,
    adjustment: number
  ): Promise<boolean>;
  getStoreUrl(): string;
  verifyWebhookSignature(body: string, hmacHeader: string): boolean;
}
