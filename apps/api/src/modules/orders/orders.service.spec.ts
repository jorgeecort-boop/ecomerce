import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../config/prisma.service';
import { CouponsService } from '../coupons/coupons.service';
import { OrderStatus, PaymentStatus, Prisma } from '@ecomerce/db';

jest.mock('@ecomerce/db', () => {
  const actual = jest.requireActual('@ecomerce/db');
  const MockDecimal = class MockDecimal {
    value: number;
    constructor(val: number) {
      this.value = val;
    }
    toString() {
      return String(this.value);
    }
  };
  return {
    ...actual,
    Prisma: {
      Decimal: MockDecimal,
    },
  };
});

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: PrismaService;

  const mockPrisma = {
    order: {
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
    store: {
      findUnique: jest.fn(),
    },
    payment: {
      create: jest.fn(),
    },
    product: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockCouponsService = {
    validate: jest.fn().mockResolvedValue({ valid: false, discountAmount: 0 }),
    redeem: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CouponsService, useValue: mockCouponsService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  const mockStore = {
    id: 'store-1',
    name: 'Test Store',
    slug: 'test-store',
    ownerId: 'owner-1',
  };

  const mockAddress = {
    firstName: 'John',
    lastName: 'Doe',
    address1: '123 Main St',
    city: 'Bogota',
    state: 'Cundinamarca',
    postalCode: '110111',
    country: 'CO',
  };

  const mockOrder = {
    id: 'order-1',
    orderNumber: 'TEST-000001',
    storeId: 'store-1',
    status: OrderStatus.PENDING,
    paymentStatus: PaymentStatus.PENDING,
    subtotal: 200,
    shippingCost: 10,
    tax: 20,
    total: 230,
    customerEmail: 'customer@test.com',
    items: [],
    store: mockStore,
  };

  describe('create', () => {
    it('should throw NotFoundException when store does not exist', async () => {
      mockPrisma.store.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          storeId: 'nonexistent',
          items: [],
          customerEmail: 'test@test.com',
          shippingAddress: mockAddress,
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should create order with calculated totals', async () => {
      mockPrisma.store.findUnique.mockResolvedValue(mockStore);
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.order.create.mockResolvedValue(mockOrder);

      const result = await service.create({
        storeId: 'store-1',
        items: [{ productId: 'p1', price: 100, quantity: 2, title: 'Product 1' }],
        shippingCost: 10,
        tax: 20,
        customerEmail: 'customer@test.com',
        shippingAddress: mockAddress,
      });

      expect(prisma.order.create).toHaveBeenCalled();
      const callArgs = mockPrisma.order.create.mock.calls[0][0];
      expect(callArgs.data.orderNumber).toBe('TEST-STORE-000001');
      expect(callArgs.data.storeId).toBe('store-1');
      expect(callArgs.data.status).toBe(OrderStatus.PENDING);
      expect(callArgs.data.paymentStatus).toBe(PaymentStatus.PENDING);
      expect(callArgs.data.customerEmail).toBe('customer@test.com');
      expect(result).toEqual(mockOrder);
    });

    it('should generate sequential order number', async () => {
      mockPrisma.store.findUnique.mockResolvedValue(mockStore);
      mockPrisma.order.count.mockResolvedValue(5);
      mockPrisma.order.create.mockResolvedValue(mockOrder);

      await service.create({
        storeId: 'store-1',
        items: [{ productId: 'p1', price: 50, quantity: 1 }],
        customerEmail: 'test@test.com',
        shippingAddress: mockAddress,
      });

      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderNumber: 'TEST-STORE-000006',
          }),
        })
      );
    });
  });

  describe('findAllByStore', () => {
    it('should throw NotFoundException when store does not exist', async () => {
      mockPrisma.store.findUnique.mockResolvedValue(null);

      await expect(service.findAllByStore('nonexistent', 'owner-1')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when user does not own store', async () => {
      mockPrisma.store.findUnique.mockResolvedValue(mockStore);

      await expect(service.findAllByStore('store-1', 'other-user')).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should return paginated orders for store owner', async () => {
      mockPrisma.store.findUnique.mockResolvedValue(mockStore);
      mockPrisma.order.findMany.mockResolvedValue([mockOrder]);
      mockPrisma.order.count = jest.fn().mockResolvedValue(1);

      const result = await service.findAllByStore('store-1', 'owner-1');

      expect(result).toEqual({ data: [mockOrder], total: 1, page: 1, totalPages: 1 });
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { storeId: 'store-1' },
          orderBy: { createdAt: 'desc' },
        })
      );
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException when order does not exist', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return order with items and store', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      const result = await service.findById('order-1');

      expect(result).toEqual(mockOrder);
      expect(prisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        include: expect.objectContaining({
          items: expect.any(Object),
          store: true,
        }),
      });
    });
  });

  describe('updateStatus', () => {
    it('should throw NotFoundException when order does not exist', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('nonexistent', 'owner-1', { status: 'SHIPPED' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own store', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        store: { ...mockStore, ownerId: 'other-owner' },
      });

      await expect(
        service.updateStatus('order-1', 'owner-1', { status: 'SHIPPED' })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update order status for owner', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        store: mockStore,
      });
      mockPrisma.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.SHIPPED,
        trackingNumber: 'TRACK123',
      });

      const result = await service.updateStatus('order-1', 'owner-1', {
        status: OrderStatus.SHIPPED,
        trackingNumber: 'TRACK123',
      });

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: {
          status: OrderStatus.SHIPPED,
          trackingNumber: 'TRACK123',
          trackingUrl: undefined,
          notes: undefined,
        },
        include: expect.any(Object),
      });
      expect(result.status).toBe(OrderStatus.SHIPPED);
    });
  });

  describe('confirmPayment', () => {
    it('should update order to paid and confirmed', async () => {
      mockPrisma.order.update.mockResolvedValue({
        ...mockOrder,
        paymentStatus: PaymentStatus.PAID,
        status: OrderStatus.CONFIRMED,
        stripePaymentId: 'pi_123',
        paidAt: expect.any(Date),
      });

      const result = await service.confirmPayment('order-1', 'pi_123');

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: {
          paymentStatus: PaymentStatus.PAID,
          stripePaymentId: 'pi_123',
          paidAt: expect.any(Date),
          status: OrderStatus.CONFIRMED,
        },
        include: expect.any(Object),
      });
      expect(result.paymentStatus).toBe(PaymentStatus.PAID);
      expect(result.status).toBe(OrderStatus.CONFIRMED);
    });
  });

  describe('updateAfterSupplierShip', () => {
    it('should update order to shipped with tracking info', async () => {
      mockPrisma.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.SHIPPED,
        supplierOrderId: 'SUP-123',
        trackingNumber: 'TRACK456',
        trackingUrl: 'https://track.example/456',
        shippedAt: expect.any(Date),
      });

      const result = await service.updateAfterSupplierShip(
        'order-1',
        'SUP-123',
        'TRACK456',
        'https://track.example/456'
      );

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: {
          status: OrderStatus.SHIPPED,
          supplierOrderId: 'SUP-123',
          trackingNumber: 'TRACK456',
          trackingUrl: 'https://track.example/456',
          shippedAt: expect.any(Date),
        },
        include: expect.any(Object),
      });
      expect(result.status).toBe(OrderStatus.SHIPPED);
    });
  });

  describe('getStats', () => {
    it('should throw NotFoundException when store does not exist', async () => {
      mockPrisma.store.findUnique.mockResolvedValue(null);

      await expect(service.getStats('nonexistent', 'owner-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own store', async () => {
      mockPrisma.store.findUnique.mockResolvedValue(mockStore);

      await expect(service.getStats('store-1', 'other-user')).rejects.toThrow(ForbiddenException);
    });

    it('should return order statistics for owner', async () => {
      mockPrisma.store.findUnique.mockResolvedValue(mockStore);
      mockPrisma.order.count.mockResolvedValueOnce(50);
      mockPrisma.order.count.mockResolvedValueOnce(10);
      mockPrisma.order.count.mockResolvedValueOnce(30);
      mockPrisma.order.count.mockResolvedValueOnce(10);
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { total: 5000 } });

      const result = await service.getStats('store-1', 'owner-1');

      expect(result).toEqual({
        totalOrders: 50,
        pendingOrders: 10,
        paidOrders: 30,
        shippedOrders: 10,
        totalRevenue: 5000,
      });
    });

    it('should handle zero revenue gracefully', async () => {
      mockPrisma.store.findUnique.mockResolvedValue(mockStore);
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { total: null } });

      const result = await service.getStats('store-1', 'owner-1');

      expect(result.totalRevenue).toBe(0);
    });
  });

  describe('createGuestOrder', () => {
    const mockStoreBySlug = { ...mockStore };

    it('should throw NotFoundException when store does not exist', async () => {
      mockPrisma.store.findUnique.mockResolvedValue(null);

      await expect(
        service.createGuestOrder({
          storeSlug: 'nonexistent',
          items: [],
          total: 0,
          customerEmail: 'guest@test.com',
          shippingAddress: {},
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should create pending guest order', async () => {
      mockPrisma.store.findUnique.mockResolvedValue(mockStoreBySlug);
      mockPrisma.order.count.mockResolvedValue(0);

      const createdOrder = {
        id: 'guest-order-1',
        orderNumber: 'TEST-STORE-000001',
        storeId: 'store-1',
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        items: [],
        store: mockStore,
      };

      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const mockTx = {
          order: {
            create: jest.fn().mockResolvedValue(createdOrder),
          },
          payment: { create: jest.fn() },
          product: { update: jest.fn() },
        };
        return fn(mockTx);
      });

      const result = await service.createGuestOrder({
        storeSlug: 'test-store',
        items: [{ productId: 'p1', price: 100, quantity: 2 }],
        subtotal: 200,
        shippingCost: 10,
        tax: 20,
        total: 230,
        currency: 'COP',
        customerEmail: 'guest@test.com',
        shippingAddress: mockAddress,
        paymentStatus: 'PENDING',
      });

      expect(result).toEqual(createdOrder);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should create paid order with payment record and inventory decrement', async () => {
      mockPrisma.store.findUnique.mockResolvedValue(mockStoreBySlug);
      mockPrisma.order.count.mockResolvedValue(0);

      const paidOrder = {
        id: 'paid-order-1',
        orderNumber: 'TEST-STORE-000001',
        storeId: 'store-1',
        status: OrderStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        items: [{ productId: 'p1', quantity: 2 }],
        store: mockStore,
      };

      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const mockTx = {
          order: {
            create: jest.fn().mockResolvedValue(paidOrder),
          },
          payment: { create: jest.fn().mockResolvedValue({ id: 'pay-1' }) },
          product: { update: jest.fn().mockResolvedValue({ inventory: 8 }) },
        };
        return fn(mockTx);
      });

      const result = await service.createGuestOrder({
        storeSlug: 'test-store',
        items: [{ productId: 'p1', price: 100, quantity: 2 }],
        subtotal: 200,
        shippingCost: 0,
        tax: 0,
        total: 200,
        currency: 'USD',
        customerEmail: 'guest@test.com',
        shippingAddress: mockAddress,
        paymentStatus: 'PAID',
        paymentIntentId: 'pi_guest123',
      });

      expect(result).toEqual(paidOrder);
    });

    it('should not create payment record when order is not paid', async () => {
      mockPrisma.store.findUnique.mockResolvedValue(mockStoreBySlug);
      mockPrisma.order.count.mockResolvedValue(0);

      const pendingOrder = {
        id: 'pending-order-1',
        items: [],
        store: mockStore,
      };

      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const mockTx = {
          order: {
            create: jest.fn().mockResolvedValue(pendingOrder),
          },
          payment: { create: jest.fn() },
          product: { update: jest.fn() },
        };
        return fn(mockTx);
      });

      await service.createGuestOrder({
        storeSlug: 'test-store',
        items: [{ productId: 'p1', price: 50, quantity: 1 }],
        subtotal: 50,
        total: 50,
        customerEmail: 'guest@test.com',
        shippingAddress: mockAddress,
        paymentStatus: 'PENDING',
      });

      const txFn = mockPrisma.$transaction.mock.calls[0][0];
      const mockTx = {
        order: { create: jest.fn().mockResolvedValue(pendingOrder) },
        payment: { create: jest.fn() },
        product: { update: jest.fn() },
      };
      await txFn(mockTx);

      expect(mockTx.payment.create).not.toHaveBeenCalled();
      expect(mockTx.product.update).not.toHaveBeenCalled();
    });
  });
});
