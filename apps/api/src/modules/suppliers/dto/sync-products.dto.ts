import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SyncProductsDto {
  @ApiProperty({ example: '100000', description: 'Product ID in supplier system' })
  @IsString()
  externalId: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  storeId?: string;

  @ApiProperty({ required: false, example: 1.5 })
  @IsNumber()
  @IsOptional()
  markup?: number;
}

export class SearchSupplierProductsDto {
  @ApiProperty({ example: 'phone case' })
  @IsString()
  query: string;

  @ApiProperty({ required: false, enum: ['aliexpress', 'cjdropshipping', 'zendrop'] })
  @IsString()
  @IsOptional()
  supplier?: string;

  @ApiProperty({ required: false, example: 1 })
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiProperty({ required: false, example: 20 })
  @IsNumber()
  @IsOptional()
  limit?: number;
}

export class ImportSupplierProductsDto {
  @ApiProperty({ type: [String], example: ['100000', '100001'] })
  @IsArray()
  @IsString({ each: true })
  externalIds: string[];

  @ApiProperty({ example: 'store_123' })
  @IsString()
  storeId: string;

  @ApiProperty({ required: false, example: 1.5 })
  @IsNumber()
  @IsOptional()
  markup?: number;
}
