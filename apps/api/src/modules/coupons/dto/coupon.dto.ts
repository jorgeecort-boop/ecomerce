import { IsString, IsOptional, IsNumber, IsBoolean, IsDateString, IsIn, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCouponDto {
  @ApiProperty({ example: 'SUMMER20' })
  @IsString()
  code: string;

  @ApiProperty({ required: false, example: '20% off your order' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ['PERCENTAGE', 'FIXED'], default: 'PERCENTAGE' })
  @IsIn(['PERCENTAGE', 'FIXED'])
  @IsOptional()
  discountType?: string;

  @ApiProperty({ example: 20, description: '20 = 20% or $20' })
  @IsNumber()
  @Min(0)
  discountValue: number;

  @ApiProperty({ required: false, example: 50, description: 'Minimum order amount' })
  @IsNumber()
  @IsOptional()
  minOrderAmount?: number;

  @ApiProperty({ required: false, example: 100, description: 'Max discount cap for percentage' })
  @IsNumber()
  @IsOptional()
  maxDiscount?: number;

  @ApiProperty({ required: false, example: 100 })
  @IsNumber()
  @IsOptional()
  usageLimit?: number;

  @ApiProperty({ required: false, default: 1 })
  @IsNumber()
  @IsOptional()
  perUserLimit?: number;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class ValidateCouponDto {
  @ApiProperty({ example: 'SUMMER20' })
  @IsString()
  code: string;

  @ApiProperty({ example: 150.00 })
  @IsNumber()
  orderTotal: number;
}
