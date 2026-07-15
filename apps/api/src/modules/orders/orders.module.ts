import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ShippoService } from './shippo.service';
import { CouponsModule } from '../coupons/coupons.module';
import { EmailModule } from '../../common/email.module';

@Module({
  imports: [CouponsModule, EmailModule],
  controllers: [OrdersController],
  providers: [OrdersService, ShippoService],
  exports: [OrdersService, ShippoService],
})
export class OrdersModule {}
