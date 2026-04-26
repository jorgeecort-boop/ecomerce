import { Module } from '@nestjs/common';
import { MercadoPagoService } from './mercado-pago.service';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { OrdersModule } from '../orders/orders.module';
import { TelegramModule } from '../../common/telegram.module';
import { EmailModule } from '../../common/email.module';

@Module({
  imports: [OrdersModule, TelegramModule, EmailModule],
  controllers: [PaymentsController],
  providers: [MercadoPagoService, PaymentsService],
  exports: [MercadoPagoService, PaymentsService],
})
export class PaymentsModule {}
