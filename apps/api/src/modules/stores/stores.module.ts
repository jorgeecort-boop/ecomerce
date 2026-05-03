import { Module } from '@nestjs/common';
import { StoresController } from './stores.controller';
import { StoresService } from './stores.service';
import { StoreAccessService } from './store-access.service';

@Module({
  controllers: [StoresController],
  providers: [StoresService, StoreAccessService],
  exports: [StoresService, StoreAccessService],
})
export class StoresModule {}
