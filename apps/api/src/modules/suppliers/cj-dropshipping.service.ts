import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface CJProduct {
  pid: string;
  productName: string;
  productNameEn?: string;
  description?: string;
  sellPrice: number;
  productWeight: number;
  productUnit: string;
  categoryId: string;
  categoryName: string;
  productImage: string;
  productImages?: string[];
  variants?: CJVariant[];
  stocks?: CJStock[];
}

export interface CJVariant {
  vid: string;
  variantName: string;
  variantSku: string;
  variantKey: string;
  variantImage?: string;
  variantSellPrice: number;
  variantWeight?: number;
}

export interface CJStock {
  vid: string;
  quantity: number;
}

export interface CJSearchResult {
  products: CJProduct[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CJOrderResult {
  orderId: string;
  orderNum: string;
  status: string;
  logisticName?: string;
  trackNumber?: string;
  createTime: string;
}

export interface CJShippingRate {
  logisticName: string;
  logisticAbbreviation: string;
  logisticPrice: number;
  estimatedDeliveryDateMin: number;
  estimatedDeliveryDateMax: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CJDropshippingService
 *
 * Official API docs: https://developers.cjdropshipping.com/api2.0/v1
 * Registration: https://app.cjdropshipping.com → My Account → API
 *
 * Required env vars:
 *   CJ_API_KEY    — from your CJ account API page
 *   CJ_API_EMAIL  — the email of your CJ account
 *
 * Auth flow: POST /authentication/getAccessToken → returns accessToken (valid 6h)
 * The service caches the token and refreshes automatically on expiry.
 */
@Injectable()
export class CJDropshippingService {
  private readonly logger = new Logger(CJDropshippingService.name);
  private readonly BASE_URL = 'https://developers.cjdropshipping.com/api2.0/v1';

  // Token cache
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(private config: ConfigService) {}

  // ── Authentication ──────────────────────────────────────────────────────────

  /**
   * Obtiene (o refresca) el access token de CJ Dropshipping.
   * El token dura 6 horas. Se cachea en memoria.
   */
  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiry) {
      return this.accessToken;
    }

    const email = this.config.get<string>('CJ_API_EMAIL');
    const password = this.config.get<string>('CJ_API_KEY');

    if (!email || !password) {
      this.logger.warn('CJ_API_EMAIL or CJ_API_KEY not configured — using mock mode');
      throw new Error('CJ Dropshipping API credentials not configured');
    }

    const res = await this.request<{ accessToken: string; refreshToken: string }>(
      '/authentication/getAccessToken',
      'POST',
      { email, password },
      false, // don't add auth header yet
    );

    this.accessToken = res.accessToken;
    // Token valid for 6 hours, we refresh 10 minutes before expiry
    this.tokenExpiry = now + (6 * 60 - 10) * 60 * 1000;

    this.logger.log('CJ Dropshipping: access token refreshed');
    return this.accessToken;
  }

  // ── Products ────────────────────────────────────────────────────────────────

  /**
   * Search products by keyword.
   * Endpoint: GET /product/list
   */
  async searchProducts(
    query: string,
    page = 1,
    pageSize = 20,
    categoryId?: string,
  ): Promise<CJSearchResult> {
    const params = new URLSearchParams({
      productName: query,
      pageNum: String(page),
      pageSize: String(pageSize),
      ...(categoryId ? { categoryId } : {}),
    });

    const data = await this.request<{
      list: CJProduct[];
      total: number;
      pageNum: number;
      pageSize: number;
    }>(`/product/list?${params.toString()}`, 'GET');

    return {
      products: data.list ?? [],
      total: data.total ?? 0,
      page: data.pageNum ?? page,
      pageSize: data.pageSize ?? pageSize,
    };
  }

  /**
   * Get full product details including all variants and images.
   * Endpoint: GET /product/query
   */
  async getProduct(pid: string): Promise<CJProduct | null> {
    try {
      const data = await this.request<CJProduct>(
        `/product/query?pid=${encodeURIComponent(pid)}`,
        'GET',
      );
      return data;
    } catch (err) {
      this.logger.warn(`CJ product not found: ${pid}`);
      return null;
    }
  }

  /**
   * Get all categories to browse products.
   * Endpoint: GET /product/getCategory
   */
  async getCategories(): Promise<{ categoryId: string; categoryName: string }[]> {
    const data = await this.request<{ categoryId: string; categoryName: string }[]>(
      '/product/getCategory',
      'GET',
    );
    return data ?? [];
  }

  // ── Shipping ─────────────────────────────────────────────────────────────────

  /**
   * Get available shipping methods and rates for a product.
   * Endpoint: POST /logistic/freightCalculate
   */
  async getShippingRates(
    pid: string,
    vid: string,
    quantity: number,
    countryCode: string, // e.g. "US", "MX", "GB"
  ): Promise<CJShippingRate[]> {
    const data = await this.request<CJShippingRate[]>(
      '/logistic/freightCalculate',
      'POST',
      {
        pid,
        vid,
        quantity,
        countryCode,
        taxId: '',
      },
    );
    return data ?? [];
  }

  // ── Orders ──────────────────────────────────────────────────────────────────

  /**
   * Create an order on CJ Dropshipping after the customer pays.
   * Endpoint: POST /shopping/order/createOrder
   *
   * @param orderNum    Your internal order ID (used as reference)
   * @param products    Array of { vid, quantity }
   * @param address     Customer shipping address
   */
  async createOrder(
    orderNum: string,
    products: { vid: string; quantity: number }[],
    address: {
      name: string;
      phone: string;
      countryCode: string;
      province: string;
      city: string;
      address: string;
      zipCode: string;
    },
  ): Promise<CJOrderResult> {
    const data = await this.request<CJOrderResult>(
      '/shopping/order/createOrder',
      'POST',
      {
        orderNum,
        products,
        shippingInfo: address,
        shippingCountry: address.countryCode,
        shippingZip: address.zipCode,
        shippingPhone: address.phone,
        shippingCustomerName: address.name,
        shippingAddress: address.address,
        shippingCity: address.city,
        shippingProvince: address.province,
      },
    );
    return data;
  }

  /**
   * Get order details and tracking from CJ.
   * Endpoint: GET /shopping/order/getOrderDetail
   */
  async getOrderDetail(orderId: string): Promise<CJOrderResult | null> {
    try {
      const data = await this.request<CJOrderResult>(
        `/shopping/order/getOrderDetail?orderId=${orderId}`,
        'GET',
      );
      return data;
    } catch {
      return null;
    }
  }

  /**
   * Confirm and pay for an order on CJ (requires CJ wallet balance).
   * Endpoint: POST /shopping/order/confirmOrder
   */
  async confirmOrder(orderId: string): Promise<{ success: boolean }> {
    await this.request('/shopping/order/confirmOrder', 'POST', { orderId });
    return { success: true };
  }

  // ── Internal HTTP helper ──────────────────────────────────────────────────

  private async request<T>(
    path: string,
    method: 'GET' | 'POST',
    body?: Record<string, unknown>,
    withAuth = true,
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (withAuth) {
      const token = await this.getAccessToken();
      headers['CJ-Access-Token'] = token;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const res = await fetch(`${this.BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const json = await res.json() as { code: number; message: string; data?: T; result?: T };

      if (!res.ok || (json.code !== undefined && json.code !== 200)) {
        throw new HttpException(
          `CJ API error: ${json.message ?? res.statusText}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      // CJ wraps responses in { code, message, data } or { code, message, result }
      return (json.data ?? json.result ?? json) as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}
