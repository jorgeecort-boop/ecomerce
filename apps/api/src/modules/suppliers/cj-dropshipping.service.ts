import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CJProduct {
  pid: string;
  productName: string;
  productNameEn?: string;
  description?: string;
  sellPrice: number | string;
  productWeight?: number;
  productUnit?: string;
  categoryId?: string;
  categoryName?: string;
  productImage?: string;
  productImages?: string[];
  variants?: CJVariant[];
  stocks?: CJStock[];
}

export interface CJVariant {
  vid: string;
  variantName: string;
  variantSku: string;
  variantKey?: string;
  variantImage?: string;
  variantSellPrice: number | string;
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

interface CJAuthToken {
  accessToken: string;
  refreshToken?: string;
}

interface CJApiEnvelope<T> {
  code?: number | string;
  result?: boolean | T;
  message?: string;
  data?: T;
  accessToken?: string;
  refreshToken?: string;
}

@Injectable()
export class CJDropshippingService {
  private readonly logger = new Logger(CJDropshippingService.name);
  private readonly baseUrl = 'https://developers.cjdropshipping.com/api2.0/v1';

  private static readonly TOKEN_TTL_MS = 170 * 24 * 60 * 60 * 1000;
  private static readonly TOKEN_REFRESH_SKEW_MS = 24 * 60 * 60 * 1000;
  private static readonly MIN_REQUEST_INTERVAL_MS = 1100;
  private static readonly MAX_ATTEMPTS = 3;

  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry = 0;
  private nextRequestAt = 0;

  constructor(private readonly config: ConfigService) {}

  async searchProducts(
    query: string,
    page = 1,
    pageSize = 20,
    categoryId?: string
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

  async getProduct(pid: string): Promise<CJProduct | null> {
    try {
      return await this.request<CJProduct>(
        `/product/query?pid=${encodeURIComponent(pid)}`,
        'GET'
      );
    } catch (error) {
      this.logger.warn(`CJ product not found: ${pid}`);
      return null;
    }
  }

  async getCategories(): Promise<{ categoryId: string; categoryName: string }[]> {
    const data = await this.request<{ categoryId: string; categoryName: string }[]>(
      '/product/getCategory',
      'GET'
    );
    return data ?? [];
  }

  async getShippingRates(
    pid: string,
    vid: string,
    quantity: number,
    countryCode: string
  ): Promise<CJShippingRate[]> {
    const data = await this.request<CJShippingRate[]>('/logistic/freightCalculate', 'POST', {
      pid,
      vid,
      quantity,
      countryCode,
      taxId: '',
    });
    return data ?? [];
  }

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
    }
  ): Promise<CJOrderResult> {
    return this.request<CJOrderResult>('/shopping/order/createOrder', 'POST', {
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
    });
  }

  async getOrderDetail(orderId: string): Promise<CJOrderResult | null> {
    try {
      return await this.request<CJOrderResult>(
        `/shopping/order/getOrderDetail?orderId=${encodeURIComponent(orderId)}`,
        'GET'
      );
    } catch {
      return null;
    }
  }

  async confirmOrder(orderId: string): Promise<{ success: boolean }> {
    await this.request('/shopping/order/confirmOrder', 'POST', { orderId });
    return { success: true };
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiry - CJDropshippingService.TOKEN_REFRESH_SKEW_MS) {
      return this.accessToken;
    }

    if (this.refreshToken) {
      try {
        const refreshed = await this.request<CJAuthToken>(
          '/authentication/refreshAccessToken',
          'POST',
          { refreshToken: this.refreshToken },
          false
        );
        this.setToken(refreshed, now);
        this.logger.log('CJ Dropshipping: access token refreshed');
        return this.accessToken!;
      } catch {
        this.logger.warn('CJ refresh token failed; requesting a new token');
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = 0;
      }
    }

    const email = this.config.get<string>('CJ_API_EMAIL');
    const password = this.config.get<string>('CJ_API_KEY');

    if (!email || !password) {
      this.logger.warn('CJ_API_EMAIL or CJ_API_KEY not configured; using supplier fallback');
      throw new Error('CJ Dropshipping API credentials not configured');
    }

    const token = await this.request<CJAuthToken>(
      '/authentication/getAccessToken',
      'POST',
      { email, password },
      false
    );
    this.setToken(token, now);
    this.logger.log('CJ Dropshipping: access token loaded');
    return this.accessToken!;
  }

  private setToken(token: CJAuthToken, now = Date.now()) {
    if (!token.accessToken) {
      throw new Error('CJ authentication returned no access token');
    }

    this.accessToken = token.accessToken;
    this.refreshToken = token.refreshToken ?? this.refreshToken;
    this.tokenExpiry = now + CJDropshippingService.TOKEN_TTL_MS;
  }

  private async request<T>(
    path: string,
    method: 'GET' | 'POST',
    body?: Record<string, unknown>,
    withAuth = true
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= CJDropshippingService.MAX_ATTEMPTS; attempt += 1) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      if (withAuth) {
        headers['CJ-Access-Token'] = await this.getAccessToken();
      }

      await this.waitForRateLimit();

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);

      try {
        const response = await fetch(`${this.baseUrl}${path}`, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });
        const json = (await response.json().catch(() => ({}))) as CJApiEnvelope<T>;

        if (withAuth && (response.status === 401 || json.code === 160101)) {
          this.accessToken = null;
          this.tokenExpiry = 0;
          if (attempt < CJDropshippingService.MAX_ATTEMPTS) continue;
        }

        if (!response.ok || !this.isSuccessfulResponse(json)) {
          throw new HttpException(
            `CJ API error: ${json.message ?? response.statusText}`,
            this.isRetryableStatus(response.status) ? HttpStatus.BAD_GATEWAY : HttpStatus.BAD_REQUEST
          );
        }

        return this.unwrapResponse<T>(json);
      } catch (error) {
        lastError = error;
        if (attempt >= CJDropshippingService.MAX_ATTEMPTS || !this.isRetryableError(error)) {
          throw error;
        }
        await this.delay(500 * attempt);
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError instanceof Error ? lastError : new Error('CJ API request failed');
  }

  private isSuccessfulResponse<T>(json: CJApiEnvelope<T>): boolean {
    if (json.code === undefined) return true;
    return json.code === 200 || json.code === '200' || json.result === true;
  }

  private unwrapResponse<T>(json: CJApiEnvelope<T>): T {
    if (json.data !== undefined) return json.data;
    if (json.accessToken) {
      return {
        accessToken: json.accessToken,
        refreshToken: json.refreshToken,
      } as T;
    }
    return (json.result ?? json) as T;
  }

  private isRetryableStatus(status: number): boolean {
    return status === 408 || status === 429 || status >= 500;
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof HttpException) {
      return error.getStatus() === HttpStatus.BAD_GATEWAY;
    }
    return true;
  }

  private async waitForRateLimit() {
    const waitMs = Math.max(0, this.nextRequestAt - Date.now());
    if (waitMs > 0) {
      await this.delay(waitMs);
    }
    this.nextRequestAt = Date.now() + CJDropshippingService.MIN_REQUEST_INTERVAL_MS;
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
