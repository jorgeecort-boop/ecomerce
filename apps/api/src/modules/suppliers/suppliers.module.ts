import { Module } from '@nestjs/common';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { SupplierApiService } from './supplier-api.service';
import { CJDropshippingService } from './cj-dropshipping.service';
import { AliExpressService } from './aliexpress.service';

@Module({
  controllers: [SuppliersController],
  providers: [
    SuppliersService,
    CJDropshippingService,
    AliExpressService,
    SupplierApiService,   // depends on CJ + AE, must be last
  ],
  exports: [SuppliersService, SupplierApiService, CJDropshippingService, AliExpressService],
})
export class SuppliersModule {}
