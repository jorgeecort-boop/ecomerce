import { IsString, IsOptional, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AddToCartDto {
  @ApiProperty({ example: 'product_123' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsOptional()
  quantity?: number;

  @ApiProperty({ required: false, example: { color: 'Red', size: 'L' } })
  @IsOptional()
  variant?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  sessionId?: string;
}

export class UpdateCartItemDto {
  @ApiProperty({ example: 2 })
  @IsNumber()
  quantity: number;

  @ApiProperty({ required: false })
  @IsOptional()
  variant?: Record<string, any>;
}

export class ApplyCouponDto {
  @ApiProperty({ example: 'SUMMER20' })
  @IsString()
  code: string;
}

export class CheckoutDto {
  @ApiProperty({ example: 'cus_123' })
  @IsString()
  @IsOptional()
  stripeCustomerId?: string;

  @ApiProperty({
    example: { name: 'John Doe', address: '123 Main St', city: 'NY', country: 'US', zip: '10001' },
  })
  @IsOptional()
  shippingAddress?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional()
  billingAddress?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  customerEmail?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  customerPhone?: string;
}
