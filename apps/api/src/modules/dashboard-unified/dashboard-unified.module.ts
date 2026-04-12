import { Module } from '@nestjs/common';
import { DashboardUnifiedController } from './dashboard-unified.controller';
import { DashboardUnifiedService } from './dashboard-unified.service';
import { ShopifyModule } from '../shopify/shopify.module';
import { SuppliersModule } from '../suppliers/suppliers.module';

@Module({
  controllers: [DashboardUnifiedController],
  providers: [DashboardUnifiedService],
  exports: [DashboardUnifiedService],
  imports: [ShopifyModule, SuppliersModule],
})
export class DashboardUnifiedModule {}
