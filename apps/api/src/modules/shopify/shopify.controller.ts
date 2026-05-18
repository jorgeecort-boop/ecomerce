import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ShopifyService } from './shopify.service';
import { AutoFulfillmentService } from './auto-fulfillment.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SyncProductsDto, CreateShopifyProductDto, FulfillOrderDto, ImportProductsDto } from './dto/shopify.dto';

@ApiTags('shopify')
@Controller('shopify')
export class ShopifyController {
  constructor(
    private readonly shopifyService: ShopifyService,
    private readonly autoFulfillmentService: AutoFulfillmentService
  ) {}

  @Get('orders')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get orders from Shopify' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getOrders(@Query('status') status?: string, @Query('limit') limit?: number) {
    return this.shopifyService.getOrders(status || 'any', limit ? Number(limit) : 50);
  }

  @Get('orders/:orderId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get specific order from Shopify' })
  async getOrder(@Param('orderId') orderId: string) {
    return this.shopifyService.getOrder(Number(orderId));
  }

  @Get('products')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get products from Shopify' })
  @ApiQuery({ name: 'limit', required: false })
  async getProducts(@Query('limit') limit?: number) {
    return this.shopifyService.getProducts(limit ? Number(limit) : 50);
  }

  @Get('products/:productId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get specific product from Shopify' })
  async getProduct(@Param('productId') productId: string) {
    return this.shopifyService.getProduct(Number(productId));
  }

  @Post('products')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create product in Shopify' })
  async createProduct(@Body() dto: CreateShopifyProductDto) {
    return this.shopifyService.createProduct({
      title: dto.title,
      body_html: dto.bodyHtml,
      vendor: dto.vendor,
      product_type: dto.productType,
      variants: dto.variants?.map((v) => ({
        price: v.price,
        sku: v.sku,
        barcode: v.barcode,
      })),
      images: dto.images,
    });
  }

  @Post('products/:productId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update product in Shopify' })
  async updateProduct(@Param('productId') productId: string, @Body() dto: CreateShopifyProductDto) {
    return this.shopifyService.updateProduct(Number(productId), {
      title: dto.title,
      body_html: dto.bodyHtml,
      vendor: dto.vendor,
      product_type: dto.productType,
    });
  }

  @Post('fulfill')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Fulfill order in Shopify' })
  async fulfillOrder(@Body() dto: FulfillOrderDto) {
    const locations = await this.shopifyService.getLocations();
    const locationId = locations[0]?.id || 1;

    return this.shopifyService.fulfillOrder(
      dto.orderId,
      locationId,
      dto.trackingCompany,
      dto.trackingNumbers
    );
  }

  @Get('locations')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get Shopify locations' })
  async getLocations() {
    return this.shopifyService.getLocations();
  }

  @Post('import-products')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Import products from Shopify to Ecomerce' })
  @ApiQuery({ name: 'storeId', required: true })
  async importProducts(@Query('storeId') storeId: string) {
    return this.shopifyService.importProducts(storeId);
  }

  @Get('sync/orders')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get synced orders from Ecomerce' })
  async getSyncedOrders(@Query('storeId') storeId?: string) {
    return this.autoFulfillmentService.getSyncedOrders(storeId);
  }

  @Get('sync/stats')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get Shopify sync stats' })
  async getSyncStats(@Query('storeId') storeId?: string) {
    return this.autoFulfillmentService.getStats(storeId);
  }
}
