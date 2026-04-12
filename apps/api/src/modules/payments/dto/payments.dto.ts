import { IsString, IsNumber, IsOptional, IsEmail, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePaymentIntentDto {
  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsEmail()
  customerEmail: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateGuestOrderDto {
  @IsString()
  storeSlug: string;

  @IsObject()
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;

  @IsEmail()
  customerEmail: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsObject()
  shippingAddress: Record<string, any>;

  @IsNumber()
  subtotal: number;

  @IsNumber()
  shippingCost: number;

  @IsNumber()
  tax: number;

  @IsNumber()
  total: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsString()
  paymentIntentId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class StripeWebhookDto {
  @IsString()
  type: string;

  @IsObject()
  data: Record<string, any>;
}
