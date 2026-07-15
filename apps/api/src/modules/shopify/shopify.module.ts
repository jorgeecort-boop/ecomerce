import { Module } from '@nestjs/common';
import { ShopifyController } from './shopify.controller';
import { ShopifyWebhookController } from './shopify-webhook.controller';
import { ShopifyService } from './shopify.service';
import { AutoFulfillmentService } from './auto-fulfillment.service';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { TelegramModule } from '../../common/telegram.module';

@Module({
  controllers: [ShopifyController, ShopifyWebhookController],
  providers: [ShopifyService, AutoFulfillmentService],
  exports: [ShopifyService, AutoFulfillmentService],
  imports: [SuppliersModule, TelegramModule],
})
export class ShopifyModule {}
