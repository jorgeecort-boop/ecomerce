import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../config/prisma.service';
import { MercadoPagoService } from './mercado-pago.service';
import { TelegramService } from '../../common/telegram.service';
import { EmailService } from '../../common/email.service';
import { AutoFulfillmentService } from '../shopify/auto-fulfillment.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: PrismaService;
  let mercadoPago: MercadoPagoService;

  const mockPrisma = {
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockMercadoPago = {
    getPayment: jest.fn(),
  };

  const mockTelegram = {
    sendMessage: jest.fn().mockResolvedValue(true),
    notifyNewOrder: jest.fn().mockResolvedValue(true),
    notifyPaymentReceived: jest.fn().mockResolvedValue(true),
    notifyLowStock: jest.fn().mockResolvedValue(true),
    notifySystemError: jest.fn().mockResolvedValue(true),
    notifyDeploySuccess: jest.fn().mockResolvedValue(true),
  };

  const mockEmail = {
    send: jest.fn().mockResolvedValue(true),
    sendOrderConfirmation: jest.fn().mockResolvedValue(true),
  };

  const mockAutoFulfillment = {
    fulfillStoreOrder: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MercadoPagoService, useValue: mockMercadoPago },
        { provide: TelegramService, useValue: mockTelegram },
        { provide: EmailService, useValue: mockEmail },
        { provide: AutoFulfillmentService, useValue: mockAutoFulfillment },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prisma = module.get<PrismaService>(PrismaService);
    mercadoPago = module.get<MercadoPagoService>(MercadoPagoService);

    jest.clearAllMocks();
  });

  const mockOrder = {
    id: 'order-1',
    orderNumber: 'TEST-000001',
    total: 250,
    currency: 'COP',
    paymentStatus: 'PENDING',
    status: 'PENDING',
    customerEmail: null,
    shippingAddress: null,
    items: [],
  };

  const mockOrderWithEmail = {
    ...mockOrder,
    customerEmail: 'cliente@example.com',
    shippingAddress: { name: 'Juan Pérez', address: 'Calle 1', city: 'Bogotá', country: 'Colombia' },
    items: [
      { title: 'Producto A', quantity: 2, price: 100 },
      { title: 'Producto B', quantity: 1, price: 50 },
    ],
  };

  const mockPaymentRecord = {
    id: 'pay-1',
    orderId: 'order-1',
    stripePaymentIntentId: 'mp-12345',
    amount: 250,
    currency: 'COP',
    status: 'PENDING',
    method: 'mercadopago',
  };

  describe('handlePaymentNotification', () => {
    it('should return early for non-payment type', async () => {
      const result = await service.handlePaymentNotification({
        type: 'plan',
        data: { id: 'plan-1' },
      });

      expect(result).toEqual({ received: true });
      expect(mockMercadoPago.getPayment).not.toHaveBeenCalled();
    });

    it('should return early when payment has no orderId in metadata', async () => {
      mockMercadoPago.getPayment.mockResolvedValue({
        status: 'approved',
        metadata: {},
        payment_method_id: 'visa',
      });

      const result = await service.handlePaymentNotification({
        type: 'payment',
        data: { id: 12345 },
      });

      expect(result).toEqual({ received: true });
      expect(prisma.order.findUnique).not.toHaveBeenCalled();
    });

    it('should return early when order is not found', async () => {
      mockMercadoPago.getPayment.mockResolvedValue({
        status: 'approved',
        metadata: { orderId: 'nonexistent' },
        payment_method_id: 'visa',
      });
      mockPrisma.order.findUnique.mockResolvedValue(null);

      const result = await service.handlePaymentNotification({
        type: 'payment',
        data: { id: 12345 },
      });

      expect(result).toEqual({ received: true });
      expect(prisma.payment.findFirst).not.toHaveBeenCalled();
    });

    it('should create new payment record if none exists', async () => {
      mockMercadoPago.getPayment.mockResolvedValue({
        status: 'approved',
        metadata: { orderId: 'order-1' },
        payment_method_id: 'pse',
      });
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.payment.findFirst.mockResolvedValue(null);
      mockPrisma.payment.create.mockResolvedValue(mockPaymentRecord);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      await service.handlePaymentNotification({
        type: 'payment',
        data: { id: 12345 },
      });

      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: {
          orderId: 'order-1',
          stripePaymentIntentId: '12345',
          amount: 250,
          currency: 'COP',
          status: 'PENDING',
          method: 'pse',
        },
      });
    });

    it('should mark order as PAID when payment is approved', async () => {
      mockMercadoPago.getPayment.mockResolvedValue({
        status: 'approved',
        metadata: { orderId: 'order-1' },
        payment_method_id: 'mercadopago',
      });
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.payment.findFirst.mockResolvedValue(mockPaymentRecord);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      await service.handlePaymentNotification({
        type: 'payment',
        data: { id: 12345 },
      });

      expect(prisma.$transaction).toHaveBeenCalledWith([
        expect.objectContaining({}),
        expect.objectContaining({}),
      ]);

      const txCalls = mockPrisma.$transaction.mock.calls[0][0];
      expect(txCalls).toHaveLength(2);
    });

    it('should mark payment as FAILED when status is rejected', async () => {
      mockMercadoPago.getPayment.mockResolvedValue({
        status: 'rejected',
        metadata: { orderId: 'order-1' },
        payment_method_id: 'visa',
      });
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.payment.findFirst.mockResolvedValue(mockPaymentRecord);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      await service.handlePaymentNotification({
        type: 'payment',
        data: { id: 12345 },
      });

      expect(prisma.$transaction).toHaveBeenCalled();
      const txCalls = mockPrisma.$transaction.mock.calls[0][0];
      expect(txCalls).toHaveLength(2);
    });

    it('should mark payment as FAILED when status is cancelled', async () => {
      mockMercadoPago.getPayment.mockResolvedValue({
        status: 'cancelled',
        metadata: { orderId: 'order-1' },
        payment_method_id: 'master',
      });
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.payment.findFirst.mockResolvedValue(mockPaymentRecord);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      await service.handlePaymentNotification({
        type: 'payment',
        data: { id: 12345 },
      });

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should keep payment as PENDING when status is pending', async () => {
      mockMercadoPago.getPayment.mockResolvedValue({
        status: 'pending',
        metadata: { orderId: 'order-1' },
        payment_method_id: 'rapipago',
      });
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.payment.findFirst.mockResolvedValue(mockPaymentRecord);
      mockPrisma.payment.update.mockResolvedValue({ ...mockPaymentRecord, status: 'PENDING' });

      await service.handlePaymentNotification({
        type: 'payment',
        data: { id: 12345 },
      });

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay-1' },
        data: { status: 'PENDING' },
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should keep payment as PENDING when status is in_process', async () => {
      mockMercadoPago.getPayment.mockResolvedValue({
        status: 'in_process',
        metadata: { orderId: 'order-1' },
        payment_method_id: 'bolbank',
      });
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.payment.findFirst.mockResolvedValue(mockPaymentRecord);
      mockPrisma.payment.update.mockResolvedValue({ ...mockPaymentRecord, status: 'PENDING' });

      await service.handlePaymentNotification({
        type: 'payment',
        data: { id: 12345 },
      });

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay-1' },
        data: { status: 'PENDING' },
      });
    });

    it('should use existing payment record when found', async () => {
      mockMercadoPago.getPayment.mockResolvedValue({
        status: 'approved',
        metadata: { orderId: 'order-1' },
        payment_method_id: 'mercadopago',
      });
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.payment.findFirst.mockResolvedValue(mockPaymentRecord);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      await service.handlePaymentNotification({
        type: 'payment',
        data: { id: 12345 },
      });

      expect(prisma.payment.create).not.toHaveBeenCalled();
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should default method to mercadopago when payment_method_id is null', async () => {
      mockMercadoPago.getPayment.mockResolvedValue({
        status: 'approved',
        metadata: { orderId: 'order-1' },
        payment_method_id: null,
      });
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.payment.findFirst.mockResolvedValue(null);
      mockPrisma.payment.create.mockResolvedValue(mockPaymentRecord);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      await service.handlePaymentNotification({
        type: 'payment',
        data: { id: 12345 },
      });

      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            method: 'mercadopago',
          }),
        })
      );
    });

    it('should convert numeric payment id to string', async () => {
      mockMercadoPago.getPayment.mockResolvedValue({
        status: 'approved',
        metadata: { orderId: 'order-1' },
        payment_method_id: 'visa',
      });
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.payment.findFirst.mockResolvedValue(null);
      mockPrisma.payment.create.mockResolvedValue(mockPaymentRecord);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      await service.handlePaymentNotification({
        type: 'payment',
        data: { id: 98765 },
      });

      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stripePaymentIntentId: '98765',
          }),
        })
      );
    });

    it('should send order confirmation email when payment is approved and customerEmail exists', async () => {
      mockMercadoPago.getPayment.mockResolvedValue({
        status: 'approved',
        metadata: { orderId: 'order-1' },
        payment_method_id: 'pse',
      });
      mockPrisma.order.findUnique.mockResolvedValue(mockOrderWithEmail);
      mockPrisma.payment.findFirst.mockResolvedValue(mockPaymentRecord);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      await service.handlePaymentNotification({
        type: 'payment',
        data: { id: 12345 },
      });

      expect(mockEmail.sendOrderConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'cliente@example.com',
          orderNumber: 'TEST-000001',
          customerName: 'Juan Pérez',
          total: 250,
          currency: 'COP',
        })
      );
    });

    it('should NOT send email when payment is approved but customerEmail is null', async () => {
      mockMercadoPago.getPayment.mockResolvedValue({
        status: 'approved',
        metadata: { orderId: 'order-1' },
        payment_method_id: 'pse',
      });
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder); // customerEmail: null
      mockPrisma.payment.findFirst.mockResolvedValue(mockPaymentRecord);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      await service.handlePaymentNotification({
        type: 'payment',
        data: { id: 12345 },
      });

      expect(mockEmail.sendOrderConfirmation).not.toHaveBeenCalled();
    });
  });
});
