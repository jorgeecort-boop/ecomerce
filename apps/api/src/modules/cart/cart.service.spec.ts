import { Test } from '@nestjs/testing';
import { PrismaService } from '../../config/prisma.service';
import { CartService } from './cart.service';
import { TelegramService } from '../../common/telegram.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('CartService - Atomic Transactions', () => {
  let service: CartService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: PrismaService,
          useValue: {
            cart: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            cartItem: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              deleteMany: jest.fn(),
              findMany: jest.fn(),
            },
            product: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            order: {
              create: jest.fn(),
            },
            payment: {
              create: jest.fn(),
            },
            $transaction: jest.fn((fn) => {
              // Simulate transaction by running the function with a mock tx
              const tx = {
                order: { create: prisma.order.create },
                product: { update: prisma.product.update },
                cartItem: { deleteMany: prisma.cartItem.deleteMany },
                payment: { create: prisma.payment.create },
              };
              return fn(tx);
            }),
          },
        },
        {
          provide: TelegramService,
          useValue: { notifyNewOrder: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('checkout - atomic inventory update', () => {
    it('should update inventory within transaction', async () => {
      const mockCart = {
        id: 'cart1',
        storeId: 'store1',
        items: [
          {
            id: 'item1',
            productId: 'prod1',
            quantity: 2,
            price: 100,
            total: 200,
            product: {
              id: 'prod1',
              title: 'Product 1',
              trackInventory: true,
              inventory: 10,
              images: [],
              sku: 'SKU001',
              costPrice: 80,
            },
          },
        ],
        subtotal: 200,
        total: 200,
      };

      (prisma.cart.findUnique as jest.fn).mockResolvedValue(mockCart);
      (prisma.product.update as jest.fn).mockResolvedValue({ inventory: 8 });
      (prisma.order.create as jest.fn).mockResolvedValue({ id: 'order1', orderNumber: 'ORD-123' });
      (prisma.cartItem.deleteMany as jest.fn).mockResolvedValue({ count: 1 });

      const result = await service.checkout('cart1', {
        shippingAddress: { name: 'Test', address: '123 St', city: 'City', state: 'ST', postalCode: '12345', country: 'CO' },
        billingAddress: {},
        customerEmail: 'test@example.com',
        customerPhone: '1234567890',
      });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod1' },
        data: { inventory: 8 },
      });
      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId: 'cart1' },
      });
      expect(result.orderId).toBe('order1');
    });

    it('should throw BadRequestException when inventory is insufficient', async () => {
      const mockCart = {
        id: 'cart1',
        storeId: 'store1',
        items: [
          {
            id: 'item1',
            productId: 'prod1',
            quantity: 15,
            price: 100,
            total: 1500,
            product: {
              id: 'prod1',
              title: 'Product 1',
              trackInventory: true,
              inventory: 10,
              images: [],
              sku: 'SKU001',
              costPrice: 80,
            },
          },
        ],
        subtotal: 1500,
        total: 1500,
      };

      (prisma.cart.findUnique as jest.fn).mockResolvedValue(mockCart);

      await expect(
        service.checkout('cart1', {
          shippingAddress: { name: 'Test', address: '123 St', city: 'City', state: 'ST', postalCode: '12345', country: 'CO' },
          billingAddress: {},
          customerEmail: 'test@example.com',
          customerPhone: '1234567890',
        })
      ).rejects.toThrow(BadRequestException);
    });
  });
});
