/**
 * Unit tests for payments.controller.ts
 *
 * Tests:
 * - createPreference validates product existence in DB
 * - createPreference rejects manipulated totals
 * - createPreference rejects non-existent products
 * - webhook requires x-signature header
 * - webhook rejects invalid signature
 * - webhook rejects missing rawBody
 * - webhook accepts valid signature
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { MercadoPagoService } from './mercado-pago.service';
import { PaymentsService } from './payments.service';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../../config/prisma.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';

describe('PaymentsController', () => {
  let controller: PaymentsController;

  const dbProducts = [
    { id: 'prod-1', price: 100, title: 'Product A' },
    { id: 'prod-2', price: 50, title: 'Product B' },
  ];

  const mockPrisma = {
    product: {
      findMany: jest.fn().mockResolvedValue(dbProducts),
    },
  };

  const mockMercadoPagoService = {
    createPreference: jest.fn().mockResolvedValue({
      preferenceId: 'pref-001',
      initPoint: 'https://mpago.com/init',
      sandboxInitPoint: 'https://mpago.com/sandbox',
    }),
  };

  const mockPaymentsService = {
    handlePaymentNotification: jest.fn().mockResolvedValue({ received: true }),
  };

  const mockOrder = {
    id: 'order-1',
    orderNumber: 'TEST-000001',
  };

  const mockOrdersService = {
    createGuestOrder: jest.fn().mockResolvedValue(mockOrder),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MercadoPagoService, useValue: mockMercadoPagoService },
        { provide: PaymentsService, useValue: mockPaymentsService },
        { provide: OrdersService, useValue: mockOrdersService },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    jest.clearAllMocks();
  });

  const validDto = {
    storeSlug: 'test-store',
    items: [
      { productId: 'prod-1', price: 100, quantity: 2 },
      { productId: 'prod-2', price: 50, quantity: 1 },
    ],
    customerEmail: 'test@example.com',
    shippingAddress: { address: 'Calle 1', city: 'Bogotá', country: 'Colombia' },
    subtotal: 250,
    shippingCost: 30,
    tax: 20,
    total: 300,
    currency: 'COP',
  };

  describe('createPreference - Price Validation', () => {
    it('should create preference when prices are valid', async () => {
      mockPrisma.product.findMany.mockResolvedValue(dbProducts);

      const result = await controller.createPreference({ body: validDto });

      expect(result.preferenceId).toBe('pref-001');
      expect(result.orderId).toBe('order-1');
      expect(mockOrdersService.createGuestOrder).toHaveBeenCalled();
      expect(mockMercadoPagoService.createPreference).toHaveBeenCalled();
    });

    it('should reject when a product does not exist in DB', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'prod-1', price: 100, title: 'Product A' },
      ]);

      const dto = {
        ...validDto,
        items: [
          { productId: 'prod-1', price: 100, quantity: 1 },
          { productId: 'nonexistent', price: 50, quantity: 1 },
        ],
      };

      await expect(controller.createPreference({ body: dto })).rejects.toThrow(BadRequestException);
      expect(mockOrdersService.createGuestOrder).not.toHaveBeenCalled();
    });

    it('should reject when total does not match items * quantity + shipping + tax', async () => {
      mockPrisma.product.findMany.mockResolvedValue(dbProducts);

      const dto = { ...validDto, total: 1 };

      await expect(controller.createPreference({ body: dto })).rejects.toThrow(BadRequestException);
      expect(mockOrdersService.createGuestOrder).not.toHaveBeenCalled();
    });

    it('should handle empty items array gracefully', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);

      const dto = { ...validDto, items: [], subtotal: 0, tax: 0, shippingCost: 0, total: 0 };

      const result = await controller.createPreference({ body: dto });

      expect(result.preferenceId).toBe('pref-001');
      expect(mockOrdersService.createGuestOrder).toHaveBeenCalled();
    });
  });

  describe('handleWebhook - Signature Verification', () => {
    const CLIENT_SECRET = 'test-secret-123';
    const webhookBody = { type: 'payment', data: { id: 12345 } };
    const rawBody = Buffer.from(JSON.stringify(webhookBody));
    const xRequestId = 'req-abc-123';

    beforeEach(() => {
      process.env.MERCADOPAGO_CLIENT_SECRET = CLIENT_SECRET;
    });

    function computeSignature(body: Buffer, requestId: string): string {
      const ts = String(Math.floor(Date.now() / 1000));
      const manifest = `id:${requestId};`;
      const signedPayload = `${manifest}ts:${ts};`;
      const rawPayload = signedPayload + body.toString();
      const hmac = createHmac('sha256', CLIENT_SECRET);
      hmac.update(rawPayload);
      const v1 = hmac.digest('hex');
      return `ts=${ts},v1=${v1}`;
    }

    it('should reject when x-signature header is missing', async () => {
      await expect(
        controller.handleWebhook(webhookBody, undefined, xRequestId, { rawBody })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject when rawBody is missing', async () => {
      await expect(
        controller.handleWebhook(webhookBody, 'fake-signature', xRequestId, { rawBody: undefined })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject when rawBody is empty', async () => {
      await expect(
        controller.handleWebhook(webhookBody, 'fake-signature', xRequestId, { rawBody: Buffer.from('') })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject when signature does not match', async () => {
      await expect(
        controller.handleWebhook(webhookBody, 'ts=123,v1=badsignature', xRequestId, { rawBody })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should accept valid signature and process payment', async () => {
      const xSignature = computeSignature(rawBody, xRequestId);

      const result = await controller.handleWebhook(
        webhookBody, xSignature, xRequestId, { rawBody }
      );

      expect(result).toEqual({ received: true });
      expect(mockPaymentsService.handlePaymentNotification).toHaveBeenCalled();
    });

    it('should handle MercadoPago topic-style notifications', async () => {
      const topicBody = { topic: 'merchant_order', id: '12345' };
      const topicRawBody = Buffer.from(JSON.stringify(topicBody));
      const xSignature = computeSignature(topicRawBody, xRequestId);

      const result = await controller.handleWebhook(
        topicBody, xSignature, xRequestId, { rawBody: topicRawBody }
      );

      expect(result).toEqual({ received: true });
    });
  });
});
