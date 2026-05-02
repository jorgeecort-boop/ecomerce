import { Test } from '@nestjs/testing';
import { PrismaService } from '../../config/prisma.service';
import { OrdersService } from './orders.service';
import { CouponsService } from '../coupons/coupons.service';

describe('OrdersService - Optimized Queries', () => {
  let service: OrdersService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const couponsService = {
      validate: jest.fn().mockResolvedValue({ valid: false, discountAmount: 0, couponId: undefined }),
      redeem: jest.fn(),
    } as any;

    const module = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: {
            order: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
              aggregate: jest.fn(),
              groupBy: jest.fn(),
            },
            store: {
              findUnique: jest.fn().mockResolvedValue({ id: 'store1', slug: 'store1', ownerId: 'user1' }),
              findFirst: jest.fn().mockResolvedValue({ id: 'store1' }),
            },
            orderItem: { findMany: jest.fn() },
            product: { update: jest.fn() },
            payment: { create: jest.fn() },
            $transaction: jest.fn((fn) => fn()),
          },
        },
        { provide: CouponsService, useValue: couponsService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('findAllByStore - no N+1 queries', () => {
    it('should not include nested product in items', async () => {
      (prisma.order.findMany as jest.fn).mockResolvedValue([]);
      (prisma.order.count as jest.fn).mockResolvedValue(0);

      const result = await service.findAllByStore('store1', 'user1', 1, 20);

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            items: expect.objectContaining({
              select: expect.not.objectContaining({
                product: expect.anything(),
              }),
            }),
          }),
        })
      );
      expect(result.data).toEqual([]);
    });

    it('should support offset/limit pagination', async () => {
      (prisma.order.findMany as jest.fn).mockResolvedValue([
        { id: 'order1', orderNumber: 'ORD-001', status: 'PENDING', total: 100, createdAt: new Date(), paymentStatus: 'PENDING', customerEmail: 'test@test.com', customerPhone: '123', items: [] },
      ]);
      (prisma.order.count as jest.fn).mockResolvedValue(1);

      const result = await service.findAllByStore('store1', 'user1', 2, 20);

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 20,
        })
      );
      expect(result.page).toBe(2);
    });
  });

  describe('createGuestOrder - atomic with inventory', () => {
    it('should update inventory within transaction', async () => {
      (prisma.order.count as jest.fn).mockResolvedValue(0);

      (prisma.$transaction as jest.fn).mockImplementation(async (fn) => {
        const tx = {
          order: { create: prisma.order.create },
          product: { update: prisma.product.update },
          payment: { create: prisma.payment.create },
        };
        return fn(tx);
      });

      (prisma.order.create as jest.fn).mockResolvedValue({
        id: 'order1',
        orderNumber: 'ORD-001',
        items: [],
        store: { id: 'store1', name: 'Store', slug: 'store1' },
      });

      const result = await service.createGuestOrder({
        storeSlug: 'store1',
        items: [{ productId: 'prod1', quantity: 2, price: 100, title: 'Product 1' }],
        subtotal: 200,
        shippingCost: 0,
        tax: 0,
        total: 200,
        customerEmail: 'test@test.com',
        customerPhone: '123',
        shippingAddress: {},
        paymentStatus: 'PAID',
        paymentIntentId: 'pi_123',
        currency: 'COP',
      });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod1' },
        data: { inventory: { decrement: 2 } },
      });
    });
  });

  describe('validateGuestShipping', () => {
    it('should return valid true when store exists and shipping data is complete', async () => {
      const result = await service.validateGuestShipping('store-1', {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        address: '123 Main St',
        city: 'Bogota',
        postalCode: '110111',
        country: 'Colombia',
      });

      expect(prisma.store.findFirst).toHaveBeenCalledWith({
        where: { slug: 'store-1', isActive: true },
        select: { id: true },
      });
      expect(result).toEqual({ valid: true });
    });

    it('should throw BadRequestException when required shipping field is missing', async () => {
      await expect(
        service.validateGuestShipping('store-1', {
          firstName: 'Test',
          lastName: '',
          email: 'test@example.com',
          address: '123 Main St',
          city: 'Bogota',
          postalCode: '110111',
          country: 'Colombia',
        })
      ).rejects.toThrow('Shipping information is incomplete');
    });
  });
});
