import { Controller, Post, Body, Logger, BadRequestException, Req, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { MercadoPagoService } from './mercado-pago.service';
import { PaymentsService } from './payments.service';
import { OrdersService } from '../orders/orders.service';
import { createHmac, timingSafeEqual } from 'crypto';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly paymentsService: PaymentsService,
    private readonly ordersService: OrdersService
  ) {}

  @Post('create-preference')
  @ApiOperation({ summary: 'Create a MercadoPago payment preference and pending order' })
  async createPreference(
    @Body()
    dto: {
      storeSlug: string;
      items: Array<{ productId: string; price: number; quantity: number }>;
      customerEmail: string;
      customerPhone?: string;
      shippingAddress: Record<string, any>;
      subtotal: number;
      shippingCost: number;
      tax: number;
      total: number;
      currency?: string;
    }
  ) {
    try {
      const order = await this.ordersService.createGuestOrder({
        storeSlug: dto.storeSlug,
        items: dto.items,
        customerEmail: dto.customerEmail,
        customerPhone: dto.customerPhone,
        shippingAddress: dto.shippingAddress,
        subtotal: dto.subtotal,
        shippingCost: dto.shippingCost,
        tax: dto.tax,
        total: dto.total,
        currency: dto.currency || 'COP',
        paymentStatus: 'PENDING',
      });

      const result = await this.mercadoPagoService.createPreference(
        dto.items,
        dto.customerEmail,
        dto.total,
        dto.currency || 'COP',
        {
          orderId: order.id,
          orderNumber: order.orderNumber,
          storeSlug: dto.storeSlug,
        }
      );

      this.logger.log(`Order ${order.orderNumber} created, preference ${result.preferenceId}`);

      return {
        preferenceId: result.preferenceId,
        initPoint: result.initPoint,
        sandboxInitPoint: result.sandboxInitPoint,
        orderId: order.id,
        orderNumber: order.orderNumber,
      };
    } catch (e) {
      const error = e as Error;
      this.logger.error(`Failed to create preference: ${error.message}`);
      throw new BadRequestException('Failed to create payment preference');
    }
  }

  @Post('webhook')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Handle MercadoPago payment notifications' })
  async handleWebhook(
    @Body() body: any,
    @Headers('x-signature') xSignature: string | undefined,
    @Headers('x-request-id') xRequestId: string | undefined,
    @Req() req: any
  ) {
    this.logger.log(`Received notification: ${JSON.stringify(body)}`);

    if (xSignature && process.env.NODE_ENV === 'production') {
      const rawBody = req.rawBody as Buffer | undefined;
      if (!rawBody || rawBody.length === 0) {
        this.logger.warn('Raw body not available for signature verification');
      } else {
        const isValid = this.verifyMercadoPagoSignature(rawBody, xSignature, xRequestId || '');
        if (!isValid) {
          this.logger.warn('Invalid webhook signature');
          throw new BadRequestException('Invalid signature');
        }
        this.logger.log('Webhook signature verified');
      }
    }

    const notification = body.type ? body : { type: body.topic, data: { id: body.id } };

    return this.paymentsService.handlePaymentNotification(notification);
  }

  private verifyMercadoPagoSignature(
    rawBody: Buffer,
    xSignature: string,
    xRequestId: string
  ): boolean {
    try {
      if (!xSignature) return false;

      const parts = xSignature.split(',');
      const signatureMap: Record<string, string> = {};
      for (const part of parts) {
        const [key, value] = part.split('=');
        signatureMap[key.trim()] = value.trim().replace(/"/g, '');
      }

      const ts = signatureMap.ts;
      const v1 = signatureMap.v1;

      if (!ts || !v1) return false;

      const manifest = `id:${xRequestId};`;
      const signedPayload = `${manifest}ts:${ts};`;
      const rawPayload = signedPayload + rawBody.toString();

      const secret = process.env.MERCADOPAGO_CLIENT_SECRET || '';
      const hmac = createHmac('sha256', secret);
      hmac.update(rawPayload);
      const computedSignature = hmac.digest('hex');

      return timingSafeEqual(Buffer.from(computedSignature), Buffer.from(v1));
    } catch (e) {
      this.logger.error(`Signature verification failed: ${(e as Error).message}`);
      return false;
    }
  }
}
