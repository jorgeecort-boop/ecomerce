import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface AEProduct {
  product_id: string;
  product_title: string;
  product_main_image_url: string;
  product_small_image_urls?: { string: string[] };
  target_sale_price: string;
  target_sale_price_currency: string;
  original_price: string;
  product_detail_url: string;
  evaluate_rate?: string;
  first_level_category_id?: number;
  first_level_category_name?: string;
  shop_id?: number;
  shop_url?: string;
}

export interface AESearchResult {
  products: AEProduct[];
  total: number;
  page: number;
  hasMore: boolean;
}

export interface AEProductDetail extends AEProduct {
  product_description?: string;
  sku_price_list?: AESku[];
  delivery_info?: AEDelivery[];
}

export interface AESku {
  sku_id: string;
  sku_attr: string;
  sku_price: string;
  sku_stock: boolean;
  ipm_sku_stock?: number;
}

export interface AEDelivery {
  carrier_id: string;
  carrier_name: string;
  freight?: { amount: string; currency: string };
  send_goods_country_code: string;
  tracking_available: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AliExpressService
 *
 * Uses the AliExpress DS (Dropshipping) Portal API.
 * Registration: https://portals.aliexpress.com → become a DS seller → get API access
 * Docs:         https://developers.aliexpress.com/en/doc.htm
 *
 * Required env vars:
 *   ALIEXPRESS_APP_KEY      — from the AliExpress Open Platform
 *   ALIEXPRESS_APP_SECRET   — secret key for signing requests
 *   ALIEXPRESS_ACCESS_TOKEN — obtained via OAuth2 from your seller account
 *
 * Note: AliExpress API uses HMAC-SHA256 signature on all requests.
 *       This service handles signing automatically.
 */
@Injectable()
export class AliExpressService {
  private readonly logger = new Logger(AliExpressService.name);
  private readonly BASE_URL = 'https://api-sg.aliexpress.com/sync';  // Singapore gateway (global)
  private readonly GATEWAY_URL = 'https://gw.api.taobao.com/router/rest'; // Alternative

  constructor(private config: ConfigService) {}

  // ── Products ────────────────────────────────────────────────────────────────

  /**
   * Search products using the DS product search API.
   * Method: aliexpress.ds.text.search
   */
  async searchProducts(
    query: string,
    page = 1,
    pageSize = 20,
    sortBy: 'SALE_PRICE_ASC' | 'SALE_PRICE_DESC' | 'LAST_VOLUME_DESC' = 'LAST_VOLUME_DESC',
    locale = 'en_US',
    currency = 'USD',
    targetCountry = 'US',
  ): Promise<AESearchResult> {
    const params = {
      method: 'aliexpress.ds.text.search',
      search_key: query,
      sort: sortBy,
      page_index: page,
      page_size: pageSize,
      local: locale,
      currency,
      target_country: targetCountry,
    };

    const data = await this.request<{
      aliexpress_ds_text_search_response: {
        resp_result: {
          result: {
            mods: {
              item_list: {
                item: AEProduct[];
              };
              paged_info: {
                total_results: number;
                current_page: number;
                total_page: number;
              };
            };
          };
        };
      };
    }>(params);

    const result = data?.aliexpress_ds_text_search_response?.resp_result?.result;
    const items = result?.mods?.item_list?.item ?? [];
    const paged = result?.mods?.paged_info;

    return {
      products: items,
      total: paged?.total_results ?? 0,
      page: paged?.current_page ?? page,
      hasMore: (paged?.current_page ?? 1) < (paged?.total_page ?? 1),
    };
  }

  /**
   * Get full product details including SKUs, shipping options and description.
   * Method: aliexpress.ds.product.get
   */
  async getProduct(
    productId: string,
    locale = 'en_US',
    currency = 'USD',
    shipToCountry = 'US',
  ): Promise<AEProductDetail | null> {
    try {
      const params = {
        method: 'aliexpress.ds.product.get',
        product_id: productId,
        local: locale,
        currency,
        ship_to_country: shipToCountry,
      };

      const data = await this.request<{
        aliexpress_ds_product_get_response: {
          result: AEProductDetail;
        };
      }>(params);

      return data?.aliexpress_ds_product_get_response?.result ?? null;
    } catch (err) {
      this.logger.warn(`AliExpress product not found: ${productId}`);
      return null;
    }
  }

  /**
   * Calculate shipping cost for a product to a specific country.
   * Method: aliexpress.logistics.buyer.freight.get
   */
  async getShippingInfo(
    productId: string,
    productNum: number,
    sendGoodsCountry = 'CN',
    receiverCountry = 'US',
    city?: string,
  ): Promise<AEDelivery[]> {
    const params = {
      method: 'aliexpress.logistics.buyer.freight.get',
      param0_product_id: productId,
      param0_product_num: productNum,
      param0_send_goods_country_code: sendGoodsCountry,
      param_estimate_freight_req_dto: JSON.stringify({
        country_code: receiverCountry,
        city,
      }),
    };

    const data = await this.request<{
      aliexpress_logistics_buyer_freight_get_response: {
        result: { freight: AEDelivery[] };
      };
    }>(params);

    return (
      data?.aliexpress_logistics_buyer_freight_get_response?.result?.freight ?? []
    );
  }

  /**
   * Create a DS order on AliExpress after customer payment.
   * Method: aliexpress.ds.order.create
   */
  async createOrder(
    productList: {
      productId: string;
      productCount: number;
      productSkuId: string;
    }[],
    address: {
      contactPerson: string;
      mobileNo: string;
      province: string;
      city: string;
      address: string;
      country: string;
      zip: string;
    },
    logisticsServiceName: string,
    outOrderId: string, // Your internal order ID
  ): Promise<{ orderId: string; status: string } | null> {
    const params = {
      method: 'aliexpress.ds.order.create',
      param_place_order_request4_open_api_d_t_o: JSON.stringify({
        product_items: productList,
        logistics_address: address,
        logistics_service_name: logisticsServiceName,
        out_order_id: outOrderId,
      }),
    };

    const data = await this.request<{
      aliexpress_ds_order_create_response: {
        result: { order_id: string; is_success: boolean };
      };
    }>(params);

    const result = data?.aliexpress_ds_order_create_response?.result;
    if (!result?.is_success) return null;
    return { orderId: result.order_id, status: 'CREATED' };
  }

  /**
   * Get tracking info for an existing AliExpress order.
   * Method: aliexpress.ds.order.tracking.get
   */
  async getOrderTracking(
    orderId: string,
  ): Promise<{ trackingNo: string; carrier: string; events: { time: string; description: string }[] } | null> {
    const params = {
      method: 'aliexpress.ds.order.tracking.get',
      order_id: orderId,
    };

    const data = await this.request<{
      aliexpress_ds_order_tracking_get_response: {
        result: {
          tracking_no: string;
          logistics_company: string;
          logistics_tracking: { event_desc: string; signed_date: string }[];
        };
      };
    }>(params);

    const result = data?.aliexpress_ds_order_tracking_get_response?.result;
    if (!result) return null;

    return {
      trackingNo: result.tracking_no,
      carrier: result.logistics_company,
      events: (result.logistics_tracking ?? []).map((e) => ({
        time: e.signed_date,
        description: e.event_desc,
      })),
    };
  }

  // ── Request Signing ──────────────────────────────────────────────────────────

  /**
   * All AliExpress API requests must be signed with HMAC-MD5.
   * This method adds the required auth params and signature.
   */
  private async request<T>(params: Record<string, string | number>): Promise<T> {
    const appKey = this.config.get<string>('ALIEXPRESS_APP_KEY');
    const appSecret = this.config.get<string>('ALIEXPRESS_APP_SECRET');
    const accessToken = this.config.get<string>('ALIEXPRESS_ACCESS_TOKEN');

    if (!appKey || !appSecret) {
      this.logger.warn('ALIEXPRESS_APP_KEY or ALIEXPRESS_APP_SECRET not configured');
      throw new Error('AliExpress API credentials not configured');
    }

    const timestamp = String(Date.now());
    const allParams: Record<string, string> = {
      app_key: appKey,
      session: accessToken ?? '',
      timestamp,
      format: 'json',
      v: '2.0',
      sign_method: 'md5',
      ...Object.fromEntries(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      ),
    };

    // Build signature: sort keys, concat key+value pairs, wrap with secret, MD5
    const signature = await this.sign(allParams, appSecret);
    allParams.sign = signature;

    const body = new URLSearchParams(allParams).toString();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const res = await fetch(this.BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new HttpException(
          `AliExpress API HTTP error: ${res.status}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      const json = await res.json() as T;
      return json;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * HMAC-MD5 signature as required by AliExpress Top API.
   * Sort all params alphabetically, concatenate key+value, wrap with secret.
   */
  private async sign(
    params: Record<string, string>,
    secret: string,
  ): Promise<string> {
    const sorted = Object.keys(params)
      .sort()
      .map((k) => `${k}${params[k]}`)
      .join('');

    const toSign = `${secret}${sorted}${secret}`;

    // Node.js crypto for MD5
    const { createHash } = await import('crypto');
    return createHash('md5').update(toSign).digest('hex').toUpperCase();
  }
}
