import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MercadoPagoService } from './mercado-pago.service';
import { OrderCleanupService } from '../orders/order-cleanup.service';
import { OrdersModule } from '../orders/orders.module';
import { TelegramModule } from '../../common/telegram.module';
import { EmailModule } from '../../common/email.module';
import { ShopifyModule } from '../shopify/shopify.module';

@Module({
  imports: [OrdersModule, TelegramModule, EmailModule, ShopifyModule],
  controllers: [PaymentsController],
  providers: [MercadoPagoService, PaymentsService, OrderCleanupService],
  exports: [MercadoPagoService, PaymentsService],
})
export class PaymentsModule {}
