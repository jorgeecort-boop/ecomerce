import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ShippoService } from './shippo.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, ShippoService],
  exports: [OrdersService, ShippoService],
})
export class OrdersModule {}
