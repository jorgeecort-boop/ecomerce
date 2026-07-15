import { Controller, Post, Body, Logger, BadRequestException, Req, Headers, UnauthorizedException, Get, Param, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PrismaService } from '../../config/prisma.service';
import { MercadoPagoService } from './mercado-pago.service';
import { PaymentsService } from './payments.service';
import { OrdersService } from '../orders/orders.service';
import { createHmac, timingSafeEqual } from 'crypto';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly paymentsService: PaymentsService,
    private readonly ordersService: OrdersService
  ) {}

  @Post('create-preference')
  @UsePipes(new ValidationPipe({ whitelist: false, forbidNonWhitelisted: false, transform: false }))
  @ApiOperation({ summary: 'Create a MercadoPago payment preference and pending order' })
  async createPreference(
    @Body()
    dto: {
      storeSlug: string;
      items: Array<{ productId: string; price: number; quantity: number; title?: string }>;
      customerEmail: string;
      customerPhone?: string;
      shippingAddress: Record<string, any>;
      subtotal: number;
      shippingCost: number;
      tax: number;
      total: number;
      currency?: string;
      notes?: string;
      couponCode?: string;
    }
  ) {
    try {
      // [STEP 1] product lookup
      let dbProducts: any[];
      try {
        dbProducts = await this.prisma.product.findMany({
          where: { id: { in: dto.items.map((i) => i.productId) } },
          select: { id: true, price: true, title: true, inventory: true },
        });
      } catch (stepErr: any) {
        throw new Error(`[STEP1-products] ${stepErr.message}`);
      }

      const priceMap = new Map(dbProducts.map((p) => [p.id, { price: Number(p.price), title: p.title }]));
      for (const item of dto.items) {
        if (!priceMap.has(item.productId)) {
          throw new BadRequestException(`Product not found: ${item.productId}`);
        }
      }

      const dbSubtotal = dto.items.reduce(
        (sum, item) => sum + (priceMap.get(item.productId)?.price ?? 0) * item.quantity,
        0,
      );
      const expectedTotal = dbSubtotal + (dto.shippingCost || 0) + (dto.tax || 0);

      if (Math.abs(dto.total - expectedTotal) > 10) {
        throw new BadRequestException(
          `Total amount mismatch. Expected: ${expectedTotal}, received: ${dto.total}`,
        );
      }

      // [STEP 3] create guest order
      let order: any;
      try {
        order = await this.ordersService.createGuestOrder({
          storeSlug: dto.storeSlug,
          items: dto.items.map((item) => {
            const db = priceMap.get(item.productId);
            return {
              productId: item.productId,
              title: db?.title || item.title,
              price: db?.price ?? 0,
              quantity: item.quantity,
            };
          }),
          customerEmail: dto.customerEmail,
          customerPhone: dto.customerPhone,
          shippingAddress: dto.shippingAddress,
          subtotal: dbSubtotal,
          shippingCost: dto.shippingCost,
          tax: dto.tax,
          total: expectedTotal,
          currency: dto.currency || 'COP',
          paymentStatus: 'PENDING',
          notes: dto.notes,
          couponCode: dto.couponCode,
        });
      } catch (stepErr: any) {
        throw new Error(`[STEP3-order] ${stepErr.message}`);
      }

      // [STEP 4] corrected items
      let correctedItems: any[];
      try {
        correctedItems = dto.items.map((item) => {
          const db = priceMap.get(item.productId);
          return {
            productId: item.productId,
            title: db?.title || item.title,
            price: db?.price ?? 0,
            quantity: item.quantity,
          };
        });
      } catch (stepErr: any) {
        throw new Error(`[STEP4-correctedItems] ${stepErr.message}`);
      }

      // [STEP 5] create MercadoPago preference
      this.logger.log(`Calling createPreference with ${correctedItems.length} corrected items`);

      let result: any;
      try {
        result = await this.mercadoPagoService.createPreference(
          correctedItems,
          dto.customerEmail,
          expectedTotal,
          dto.currency || 'COP',
          {
            orderId: order.id,
            orderNumber: order.orderNumber,
            storeSlug: dto.storeSlug,
          }
        );
      } catch (stepErr: any) {
        throw new Error(`[STEP5-mp] ${stepErr.message}`);
      }

      this.logger.log(`Order ${order.orderNumber} created, preference ${result.preferenceId}`);

      return {
        preferenceId: result.preferenceId,
        initPoint: result.initPoint,
        sandboxInitPoint: result.sandboxInitPoint,
        orderId: order.id,
        orderNumber: order.orderNumber,
      };
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      const error = e as Error;
      this.logger.error(`Failed to create preference: ${error.message}`, error.stack);
      throw new BadRequestException(
        `Failed to create payment preference: ${error.message}`,
      );
    }
  }

  @Get('status/:orderNumber')
  @ApiOperation({ summary: 'Check payment status for an order (polling fallback for webhook)' })
  async getPaymentStatus(@Param('orderNumber') orderNumber: string) {
    return this.paymentsService.checkAndSyncOrderStatus(orderNumber);
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
    this.logger.log(`Payment webhook received: id=${body?.data?.id || body?.id}`);

    if (!xSignature) {
      this.logger.warn('Webhook rejected: missing x-signature header');
      throw new UnauthorizedException('Missing x-signature header');
    }

    const rawBody = req.rawBody as Buffer | undefined;
    if (!rawBody || rawBody.length === 0) {
      this.logger.error('Webhook rejected: raw body not available');
      throw new UnauthorizedException('Raw body not available for signature verification');
    }

    const isValid = this.verifyMercadoPagoSignature(rawBody, xSignature, xRequestId || '');
    if (!isValid) {
      this.logger.warn('Webhook rejected: invalid x-signature');
      throw new UnauthorizedException('Invalid signature');
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
