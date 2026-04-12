import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CloudinaryService } from './cloudinary.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, CloudinaryService],
  exports: [ProductsService, CloudinaryService],
})
export class ProductsModule {}
