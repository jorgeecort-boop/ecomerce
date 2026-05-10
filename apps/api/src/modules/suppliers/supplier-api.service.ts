import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SuppliersService } from './suppliers.service';
import { CJDropshippingService, CJProduct } from './cj-dropshipping.service';
import { AliExpressService, AEProduct } from './aliexpress.service';
import { PrismaService } from '../../config/prisma.service';

export interface SupplierProductResult {
  externalId: string;
  title: string;
  description: string;
  price: number;
  costPrice: number;
  currency: string;
  images: string[];
  shippingCost?: number;
  shippingTime?: string;
  variants?: any;
  stock?: number;
  rating?: number;
  reviewsCount?: number;
}

export interface SearchResult {
  products: SupplierProductResult[];
  total: number;
  page: number;
  hasMore: boolean;
}

type SupplierCode = 'cjdropshipping' | 'aliexpress' | 'zendrop' | string;

@Injectable()
export class SupplierApiService {
  private readonly logger = new Logger(SupplierApiService.name);

  constructor(
    private config: ConfigService,
    private suppliersService: SuppliersService,
    private cjService: CJDropshippingService,
    private aeService: AliExpressService,
    private prisma: PrismaService
  ) {}

  // ── Public dispatcher ──────────────────────────────────────────────────────

  async searchProducts(
    supplierCode: SupplierCode,
    query: string,
    page = 1,
    limit = 20
  ): Promise<SearchResult> {
    this.logger.log(`Searching [${supplierCode}]: "${query}" (page ${page})`);

    switch (supplierCode) {
      case 'cjdropshipping':
        return this.searchCJ(query, page, limit);
      case 'aliexpress':
        return this.searchAliExpress(query, page, limit);
      case 'zendrop':
        return this.searchMock('zendrop', query, page, limit);
      default:
        return this.searchMock(supplierCode, query, page, limit);
    }
  }

  async getProductDetails(
    supplierCode: SupplierCode,
    externalId: string
  ): Promise<SupplierProductResult | null> {
    this.logger.log(`Product detail [${supplierCode}]: ${externalId}`);

    switch (supplierCode) {
      case 'cjdropshipping':
        return this.getCJProduct(externalId);
      case 'aliexpress':
        return this.getAliExpressProduct(externalId);
      default:
        return this.getMockProduct(externalId);
    }
  }

  async syncSupplierProducts(supplierId: string): Promise<number> {
    const supplier = await this.suppliersService.findById(supplierId);
    this.logger.log(`Syncing products from ${supplier.name}`);

    // Try real API first, fall back to mock
    let products: SupplierProductResult[] = [];
    try {
      const result = await this.searchProducts(supplier.code, '', 1, 50);
      products = result.products;
    } catch (err) {
      this.logger.warn(`Real API failed for ${supplier.code}, using mock`);
      products = this.generateMockProducts(supplier.code);
    }

    let synced = 0;
    for (const product of products) {
      await this.suppliersService.syncProductFromExternal(supplierId, product);
      synced++;
    }
    return synced;
  }

  async importToStore(
    supplierCode: SupplierCode,
    externalIds: string[],
    storeId: string,
    markup = 1.5
  ): Promise<{ success: string[]; failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];

    for (const externalId of externalIds) {
      try {
        const productData = await this.getProductDetails(supplierCode, externalId);
        if (!productData) {
          failed.push(externalId);
          continue;
        }
        const supplier =
          (await this.suppliersService.findByCode(supplierCode)) ??
          (await this.suppliersService.create({
            name: supplierCode,
            code: supplierCode,
            isActive: true,
          }));
        const supplierProduct = await this.suppliersService.syncProductFromExternal(
          supplier.id,
          productData
        );
        const sellingPrice = Number((productData.costPrice * markup).toFixed(2));
        const existingProduct = await this.prisma.product.findFirst({
          where: {
            storeId,
            supplierProductId: supplierProduct.id,
          },
        });
        const productPayload = {
          storeId,
          title: productData.title,
          description: productData.description || '',
          price: sellingPrice,
          costPrice: productData.costPrice,
          sku: `${supplierCode}-${externalId}`,
          images: productData.images,
          category: supplierCode,
          tags: [supplierCode, 'dropshipping'],
          supplierId: supplier.id,
          supplierProductId: supplierProduct.id,
          inventory: productData.stock ?? 0,
          isPublished: false,
        };
        const product = existingProduct
          ? await this.prisma.product.update({
              where: { id: existingProduct.id },
              data: productPayload,
            })
          : await this.prisma.product.create({
              data: productPayload,
            });
        await this.suppliersService.mapToProduct(supplierProduct.id, product.id);
        this.logger.log(`Imported ${externalId} at ${sellingPrice} (${markup}x markup)`);
        success.push(externalId);
      } catch (error) {
        this.logger.error(`Failed to import ${externalId}`, error);
        failed.push(externalId);
      }
    }
    return { success, failed };
  }

  // ── CJ Dropshipping ────────────────────────────────────────────────────────

  private async searchCJ(query: string, page: number, limit: number): Promise<SearchResult> {
    try {
      const result = await this.cjService.searchProducts(query, page, limit);
      return {
        products: result.products.map(this.mapCJProduct),
        total: result.total,
        page: result.page,
        hasMore: result.page * result.pageSize < result.total,
      };
    } catch (err) {
      this.logger.warn('CJ API unavailable, falling back to mock');
      return this.searchMock('cjdropshipping', query, page, limit);
    }
  }

  private async getCJProduct(externalId: string): Promise<SupplierProductResult | null> {
    try {
      const product = await this.cjService.getProduct(externalId);
      if (!product) return this.getMockProduct(externalId);
      return this.mapCJProduct(product);
    } catch {
      return this.getMockProduct(externalId);
    }
  }

  /** Map CJ API response → internal SupplierProductResult */
  private mapCJProduct = (p: CJProduct): SupplierProductResult => {
    const cost = parseFloat(String(p.sellPrice) || '0');
    return {
      externalId: p.pid,
      title: p.productNameEn ?? p.productName,
      description: p.description ?? '',
      price: parseFloat((cost * 1.4).toFixed(2)),
      costPrice: cost,
      currency: 'USD',
      images: p.productImages?.length ? p.productImages : [p.productImage],
      shippingCost: 2.99,
      shippingTime: '7-15 days',
      variants: p.variants
        ? {
            items: p.variants.map((v) => ({
              id: v.vid,
              name: v.variantName,
              sku: v.variantSku,
              price: parseFloat(String(v.variantSellPrice) || '0'),
              image: v.variantImage,
            })),
          }
        : undefined,
      stock: p.stocks?.reduce((s, st) => s + (st.quantity ?? 0), 0),
    };
  };

  // ── AliExpress ─────────────────────────────────────────────────────────────

  private async searchAliExpress(
    query: string,
    page: number,
    limit: number
  ): Promise<SearchResult> {
    try {
      const result = await this.aeService.searchProducts(query, page, limit);
      return {
        products: result.products.map(this.mapAEProduct),
        total: result.total,
        page: result.page,
        hasMore: result.hasMore,
      };
    } catch (err) {
      this.logger.warn('AliExpress API unavailable, falling back to mock');
      return this.searchMock('aliexpress', query, page, limit);
    }
  }

  private async getAliExpressProduct(externalId: string): Promise<SupplierProductResult | null> {
    try {
      const product = await this.aeService.getProduct(externalId);
      if (!product) return this.getMockProduct(externalId);
      return this.mapAEProduct(product);
    } catch {
      return this.getMockProduct(externalId);
    }
  }

  /** Map AliExpress API response → internal SupplierProductResult */
  private mapAEProduct = (p: AEProduct): SupplierProductResult => {
    const costPrice = parseFloat(p.target_sale_price ?? p.original_price ?? '0');
    return {
      externalId: p.product_id,
      title: p.product_title,
      description: '',
      price: Number((costPrice * 1.4).toFixed(2)),
      costPrice,
      currency: p.target_sale_price_currency ?? 'USD',
      images: [p.product_main_image_url],
      shippingCost: 0, // AliExpress often free shipping
      shippingTime: '15-30 days',
      rating: parseFloat(p.evaluate_rate ?? '0') / 20, // AE rates are 0-100
    };
  };

  // ── Mock fallback ──────────────────────────────────────────────────────────

  private searchMock(
    supplierCode: string,
    query: string,
    page: number,
    limit: number
  ): SearchResult {
    const mockProducts = this.generateMockProducts(supplierCode, query);
    const start = (page - 1) * limit;
    const products = mockProducts.slice(start, start + limit);
    return {
      products,
      total: mockProducts.length,
      page,
      hasMore: start + limit < mockProducts.length,
    };
  }

  private getMockProduct(externalId: string): SupplierProductResult {
    const names = [
      'Wireless Bluetooth Earbuds',
      'Phone Case Premium',
      'Smart Watch Band',
      'USB-C Charger Cable',
      'Portable Power Bank',
      'LED Desk Lamp',
      'Yoga Mat Premium',
      'Water Bottle Steel',
      'Sunglasses Polarized',
      'Backpack Travel',
    ];
    const index = parseInt(externalId.slice(-2), 10) % names.length;
    const base = 5 + index * 2;
    return {
      externalId,
      title: names[index],
      description: `High quality ${names[index].toLowerCase()} from supplier`,
      price: base * 1.5,
      costPrice: base,
      currency: 'USD',
      images: [
        `https://picsum.photos/seed/${externalId}/400/400`,
        `https://picsum.photos/seed/${externalId}a/400/400`,
      ],
      shippingCost: 2.99,
      shippingTime: '7-15 days',
      variants: { colors: ['Black', 'White', 'Blue'], sizes: ['S', 'M', 'L', 'XL'] },
      stock: Math.floor(Math.random() * 1000),
      rating: 4.0 + Math.random(),
      reviewsCount: Math.floor(Math.random() * 500),
    };
  }

  private generateMockProducts(
    supplierCode: string,
    searchQuery?: string
  ): SupplierProductResult[] {
    const count = searchQuery ? 15 : 50;
    return Array.from({ length: count }, (_, i) => {
      const id = `${supplierCode}_${String(i + 1).padStart(6, '0')}`;
      const p = this.getMockProduct(id);
      if (searchQuery) p.title = `${searchQuery} ${p.title}`;
      return p;
    });
  }
}
