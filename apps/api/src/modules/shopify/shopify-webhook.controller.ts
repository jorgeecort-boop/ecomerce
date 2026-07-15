import { Controller, Post, Body, Headers, Logger, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ShopifyService } from './shopify.service';
import { AutoFulfillmentService } from './auto-fulfillment.service';
import { ShopifyWebhookGuard } from '../../common/guards/shopify-webhook.guard';
import { PrismaService } from '../../config/prisma.service';
import { TelegramService } from '../../common/telegram.service';

@ApiTags('shopify-webhooks')
@Controller('shopify/webhooks')
@UseGuards(ShopifyWebhookGuard)
export class ShopifyWebhookController {
  private readonly logger = new Logger(ShopifyWebhookController.name);

  constructor(
    private readonly shopifyService: ShopifyService,
    private readonly autoFulfillmentService: AutoFulfillmentService,
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
  ) {}

  @Post('orders/create')
  @ApiOperation({ summary: 'Webhook: New order created in Shopify (HMAC verified)' })
  async handleOrderCreate(
    @Body() body: any,
    @Headers('x-shopify-hmac-sha256') hmac: string,
    @Headers('x-shopify-topic') topic: string,
    @Headers('x-shopify-shop-domain') shopDomain: string,
  ) {
    this.logger.log(
      `Order webhook topic=${topic} shop=${shopDomain} order=#${body.order_number}`,
    );

    const result = await this.autoFulfillmentService.processNewOrder(body);

    return {
      success: true,
      orderId: result.orderId,
      supplierOrders: result.supplierOrders,
    };
  }

  @Post('orders/fulfilled')
  @ApiOperation({ summary: 'Webhook: Order fulfilled in Shopify (HMAC verified)' })
  async handleOrderFulfilled(
    @Body() body: any,
    @Headers('x-shopify-topic') topic: string,
    @Headers('x-shopify-shop-domain') shopDomain: string,
  ) {
    this.logger.log(
      `Fulfillment webhook ✓ topic=${topic} shop=${shopDomain} order=#${body.order_number}`,
    );

    await this.autoFulfillmentService.processFulfillmentUpdate(body);

    return { success: true };
  }

  @Post('products/update')
  @ApiOperation({ summary: 'Webhook: Product updated in Shopify (HMAC verified)' })
  async handleProductUpdate(
    @Body() body: any,
    @Headers('x-shopify-topic') topic: string,
    @Headers('x-shopify-shop-domain') shopDomain: string,
  ) {
    this.logger.log(
      `Product webhook ✓ topic=${topic} shop=${shopDomain} product=${body.id} title="${body.title}"`,
    );

    try {
      const mappings = await this.prisma.shopifyProductMapping.findMany({
        where: { shopifyProductId: body.id },
      });

      if (mappings.length === 0) {
        this.logger.warn(`No mapping found for Shopify product ${body.id}, skipping sync`);
        return { success: true, productId: body.id, synced: false, reason: 'no_mapping' };
      }

      const variant = body.variants?.[0] || {};

      for (const mapping of mappings) {
        if (!mapping.ecomerceProductId) continue;

        await this.prisma.product.update({
          where: { id: mapping.ecomerceProductId },
          data: {
            title: body.title,
            description: body.body_html || '',
            price: variant.price ? parseFloat(variant.price) : undefined,
            compareAtPrice: variant.compare_at_price ? parseFloat(variant.compare_at_price) : null,
            sku: variant.sku || undefined,
            barcode: variant.barcode || undefined,
            images: (body.images || []).map((i: any) => i.src).filter(Boolean),
            category: body.product_type || undefined,
            inventory: variant.inventory_quantity ?? undefined,
            isPublished: body.status === 'active',
            updatedAt: new Date(),
          },
        });

        await this.prisma.shopifyProductMapping.update({
          where: { id: mapping.id },
          data: { lastSyncedAt: new Date(), syncStatus: 'SYNCED' },
        });

        this.logger.log(`Synced Shopify product ${body.id} → Ecomerce ${mapping.ecomerceProductId}`);
      }

      return { success: true, productId: body.id, synced: true, mappingsUpdated: mappings.length };
    } catch (err: any) {
      this.logger.error(`Failed to sync product ${body.id}: ${err.message}`);
      return { success: true, productId: body.id, synced: false, error: err.message };
    }
  }

  @Post('app/uninstalled')
  @ApiOperation({ summary: 'Webhook: App uninstalled from shop (HMAC verified)' })
  async handleAppUninstalled(
    @Body() body: any,
    @Headers('x-shopify-shop-domain') shopDomain: string,
  ) {
    this.logger.warn(`App uninstalled from ${shopDomain}`);

    try {
      const storeName = shopDomain.replace('.myshopify.com', '');
      const store = await this.prisma.store.findFirst({
        where: { slug: storeName },
      });

      if (store) {
        await this.prisma.store.update({
          where: { id: store.id },
          data: { isActive: false },
        });

        await this.prisma.shopifyProductMapping.updateMany({
          where: { storeId: store.id },
          data: { syncStatus: 'DISCONNECTED' },
        });

        this.logger.log(`Store ${storeName} (${store.id}) deactivated after app uninstall`);
      }

      await this.telegram.sendMessage(
        `<b>⚠️ Shopify App Uninstalled</b>\n\n` +
          `Shop: <code>${shopDomain}</code>\n` +
          `Store in DB: ${store ? store.slug : 'NOT FOUND'}\n` +
          `Action: Store deactivated, mappings disconnected.`
      );

      return { success: true, shopDomain, storeDeactivated: !!store };
    } catch (err: any) {
      this.logger.error(`App uninstall cleanup failed: ${err.message}`);
      return { success: true, shopDomain, error: err.message };
    }
  }
}
