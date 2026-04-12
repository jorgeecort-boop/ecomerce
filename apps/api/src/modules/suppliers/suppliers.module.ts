import { Module } from '@nestjs/common';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { SupplierApiService } from './supplier-api.service';
import { CJDropshippingService } from './cj-dropshipping.service';
import { AliExpressService } from './aliexpress.service';
import { InventorySyncService } from './inventory-sync.service';

@Module({
  controllers: [SuppliersController],
  providers: [
    SuppliersService,
    CJDropshippingService,
    AliExpressService,
    SupplierApiService,
    InventorySyncService,
  ],
  exports: [SuppliersService, SupplierApiService, CJDropshippingService, AliExpressService],
})
export class SuppliersModule {}
