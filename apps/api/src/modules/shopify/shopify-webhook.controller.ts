import { Controller, Post, Body, Headers, Logger, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ShopifyService } from './shopify.service';
import { AutoFulfillmentService } from './auto-fulfillment.service';
import { ShopifyWebhookGuard } from '../../common/guards/shopify-webhook.guard';

@ApiTags('shopify-webhooks')
@Controller('shopify/webhooks')
@UseGuards(ShopifyWebhookGuard)
export class ShopifyWebhookController {
  private readonly logger = new Logger(ShopifyWebhookController.name);

  constructor(
    private readonly shopifyService: ShopifyService,
    private readonly autoFulfillmentService: AutoFulfillmentService,
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
      `Order webhook ✓ topic=${topic} shop=${shopDomain} email=${body.email} order=#${body.order_number}`,
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

    // TODO: Sync product changes back to Ecomerce DB
    return { success: true, productId: body.id };
  }

  @Post('app/uninstalled')
  @ApiOperation({ summary: 'Webhook: App uninstalled from shop (HMAC verified)' })
  async handleAppUninstalled(
    @Body() body: any,
    @Headers('x-shopify-shop-domain') shopDomain: string,
  ) {
    this.logger.warn(`⚠️ App uninstalled from ${shopDomain}`);
    // TODO: Clean up store data, revoke tokens, notify admin
    return { success: true };
  }
}
