import { IsString, IsOptional, IsObject, IsNumber, IsArray, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SyncProductsDto {
  @ApiProperty({ required: false })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  productIds?: number[];

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  limit?: number;
}

export class CreateShopifyProductDto {
  @ApiProperty({ example: 'Product Title' })
  @IsString()
  title: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  bodyHtml?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  vendor?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  productType?: string;

  @ApiProperty({ required: false, example: [{ price: '12.99', sku: 'SKU001' }] })
  @IsArray()
  @IsOptional()
  variants?: { price?: string; sku?: string; barcode?: string }[];

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  images?: { src: string }[];
}

export class FulfillOrderDto {
  @ApiProperty({ example: 123456789 })
  @IsNumber()
  orderId: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  trackingCompany?: string;

  @ApiProperty({ required: false, example: ['TRACKING123'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  trackingNumbers?: string[];
}

export class WebhookOrderDto {
  @ApiProperty()
  @IsObject()
  order: any;

  @ApiProperty()
  @IsString()
  topic: string;

  @ApiProperty()
  @IsString()
  shop_domain: string;
}

export class ImportProductsDto {
  @ApiProperty({ required: true })
  @IsString()
  storeId: string;
}
