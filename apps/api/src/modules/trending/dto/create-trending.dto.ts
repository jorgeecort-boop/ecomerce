import { IsString, IsOptional, IsNumber, IsUrl, IsArray, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTrendingDto {
  @ApiProperty({ example: 'tiktok', enum: ['tiktok', 'instagram', 'pinterest'] })
  @IsEnum(['tiktok', 'instagram', 'pinterest'])
  source: string;

  @ApiProperty({ example: 'https://www.tiktok.com/@user/video/123' })
  @IsUrl()
  sourceUrl: string;

  @ApiProperty({ example: '123456789' })
  @IsString()
  sourceId: string;

  @ApiProperty({ example: 'Amazing phone case!' })
  @IsString()
  title: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ required: false })
  @IsUrl()
  @IsOptional()
  videoUrl?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  views?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  likes?: number;

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  hashtags?: string[];
}

export class ImportTrendingDto {
  @ApiProperty({ example: 'trending_123' })
  @IsString()
  trendingId: string;

  @ApiProperty({ example: 'store_123' })
  @IsString()
  storeId: string;

  @ApiProperty({ required: false, example: 1.5 })
  @IsNumber()
  @IsOptional()
  markup?: number;
}
