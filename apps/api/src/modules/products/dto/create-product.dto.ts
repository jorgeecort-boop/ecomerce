import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, IsUrl, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  storeId: string;

  @ApiProperty({ example: 'Amazing Product' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'This is an amazing product that went viral on TikTok.' })
  @IsString()
  description: string;

  @ApiProperty({ example: 29.99 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @ApiProperty({ example: 24.99, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  compareAtPrice?: number;

  @ApiProperty({ example: 8.50, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  costPrice?: number;

  @ApiProperty({ example: 'SKU-001', required: false })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiProperty({ example: ['https://example.com/image1.jpg'], required: false })
  @IsArray()
  @IsOptional()
  images?: string[];

  @ApiProperty({ example: 'Electronics', required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ example: ['viral', 'trending'], required: false })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiProperty({ example: 100, required: false })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  inventory?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Boolean)
  trackInventory?: boolean;
}
