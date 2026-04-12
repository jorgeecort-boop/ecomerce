import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CartService } from './cart.service';
import { PrismaService } from '../../config/prisma.service';
import { TelegramService } from '../../common/telegram.service';

describe('CartService', () => {
  let service: CartService;
  let prisma: PrismaService;

  const mockPrisma = {
    cart: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    cartItem: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    order: {
      create: jest.fn(),
    },
  };

  const mockTelegram = {
    sendMessage: jest.fn().mockResolvedValue(true),
    notifyNewOrder: jest.fn().mockResolvedValue(true),
    notifyPaymentReceived: jest.fn().mockResolvedValue(true),
    notifyLowStock: jest.fn().mockResolvedValue(true),
    notifySystemError: jest.fn().mockResolvedValue(true),
    notifyDeploySuccess: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TelegramService, useValue: mockTelegram },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  const mockProduct = {
    id: 'prod-1',
    title: 'Test Product',
    price: 100,
    images: ['img1.jpg'],
    inventory: 10,
    trackInventory: true,
    isPublished: true,
    costPrice: 50,
    sku: 'SKU-001',
  };

  const mockCart = {
    id: 'cart-1',
    storeId: 'store-1',
    userId: null,
    sessionId: 'session-123',
    subtotal: 0,
    total: 0,
    items: [],
  };

  const mockCartItem = {
    id: 'item-1',
    cartId: 'cart-1',
    productId: 'prod-1',
    quantity: 2,
    price: 100,
    total: 200,
    variant: null,
    product: mockProduct,
  };

  describe('getCart', () => {
    it('should return cart for userId', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(mockCart);

      const result = await service.getCart('store-1', undefined, 'user-1');

      expect(result).toEqual(mockCart);
      expect(prisma.cart.findUnique).toHaveBeenCalledWith({
        where: { storeId: 'store-1', userId: 'user-1' },
        include: expect.any(Object),
      });
    });

    it('should return cart for sessionId', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(mockCart);

      const result = await service.getCart('store-1', 'session-123');

      expect(result).toEqual(mockCart);
      expect(prisma.cart.findUnique).toHaveBeenCalledWith({
        where: { storeId: 'store-1', sessionId: 'session-123' },
        include: expect.any(Object),
      });
    });

    it('should return null when no userId or sessionId', async () => {
      const result = await service.getCart('store-1');

      expect(result).toBeNull();
      expect(prisma.cart.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('getOrCreateCart', () => {
    it('should return existing cart', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(mockCart);

      const result = await service.getOrCreateCart('store-1', 'session-123');

      expect(result).toEqual(mockCart);
      expect(prisma.cart.create).not.toHaveBeenCalled();
    });

    it('should create new cart when none exists', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(null);
      mockPrisma.cart.create.mockResolvedValue(mockCart);

      const result = await service.getOrCreateCart('store-1', 'session-123');

      expect(result).toEqual(mockCart);
      expect(prisma.cart.create).toHaveBeenCalledWith({
        data: { storeId: 'store-1', sessionId: 'session-123', userId: undefined },
        include: { items: true },
      });
    });
  });

  describe('addItem', () => {
    it('should throw NotFoundException when product does not exist', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.addItem('store-1', { productId: 'nonexistent', sessionId: 's1' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when product is not published', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ ...mockProduct, isPublished: false });

      await expect(
        service.addItem('store-1', { productId: 'prod-1', sessionId: 's1' })
      ).rejects.toThrow(BadRequestException);
    });

    it('should add new item to empty cart', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.cart.findUnique.mockResolvedValue(mockCart);
      mockPrisma.cartItem.findUnique.mockResolvedValue(null);
      mockPrisma.cartItem.create.mockResolvedValue(mockCartItem);
      mockPrisma.cartItem.findMany.mockResolvedValue([mockCartItem]);
      mockPrisma.cart.update.mockResolvedValue({
        ...mockCart,
        subtotal: 200,
        total: 200,
        items: [mockCartItem],
      });

      const result = await service.addItem('store-1', {
        productId: 'prod-1',
        sessionId: 'session-123',
        quantity: 2,
      });

      expect(prisma.cartItem.create).toHaveBeenCalledWith({
        data: {
          cartId: 'cart-1',
          productId: 'prod-1',
          quantity: 2,
          price: 100,
          total: 200,
          variant: undefined,
        },
      });
      expect(result.total).toBe(200);
    });

    it('should update quantity when item already exists', async () => {
      const existingItem = { ...mockCartItem, quantity: 3 };
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.cart.findUnique.mockResolvedValue(mockCart);
      mockPrisma.cartItem.findUnique.mockResolvedValue(existingItem);
      mockPrisma.cartItem.update.mockResolvedValue({
        ...existingItem,
        quantity: 5,
        total: 500,
      });
      mockPrisma.cartItem.findMany.mockResolvedValue([
        { ...existingItem, quantity: 5, total: 500 },
      ]);
      mockPrisma.cart.update.mockResolvedValue({
        ...mockCart,
        subtotal: 500,
        total: 500,
        items: [{ ...existingItem, quantity: 5, total: 500 }],
      });

      const result = await service.addItem('store-1', {
        productId: 'prod-1',
        sessionId: 'session-123',
        quantity: 2,
      });

      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: existingItem.id },
        data: { quantity: 5, total: 500 },
      });
    });

    it('should default quantity to 1', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.cart.findUnique.mockResolvedValue(mockCart);
      mockPrisma.cartItem.findUnique.mockResolvedValue(null);
      mockPrisma.cartItem.create.mockResolvedValue({ ...mockCartItem, quantity: 1, total: 100 });
      mockPrisma.cartItem.findMany.mockResolvedValue([
        { ...mockCartItem, quantity: 1, total: 100 },
      ]);
      mockPrisma.cart.update.mockResolvedValue({
        ...mockCart,
        subtotal: 100,
        total: 100,
        items: [{ ...mockCartItem, quantity: 1, total: 100 }],
      });

      await service.addItem('store-1', { productId: 'prod-1', sessionId: 's1' });

      expect(prisma.cartItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ quantity: 1 }),
        })
      );
    });
  });

  describe('updateItem', () => {
    it('should throw NotFoundException when cart item does not exist', async () => {
      mockPrisma.cartItem.findUnique.mockResolvedValue(null);

      await expect(service.updateItem('cart-1', 'prod-1', { quantity: 5 })).rejects.toThrow(
        NotFoundException
      );
    });

    it('should remove item when quantity is 0', async () => {
      mockPrisma.cartItem.findUnique.mockResolvedValue(mockCartItem);
      mockPrisma.cartItem.delete.mockResolvedValue(mockCartItem);
      mockPrisma.cartItem.findMany.mockResolvedValue([]);
      mockPrisma.cart.update.mockResolvedValue({ ...mockCart, subtotal: 0, total: 0, items: [] });

      await service.updateItem('cart-1', 'prod-1', { quantity: 0 });

      expect(prisma.cartItem.delete).toHaveBeenCalled();
    });

    it('should update item quantity and recalculate', async () => {
      mockPrisma.cartItem.findUnique.mockResolvedValue(mockCartItem);
      mockPrisma.cartItem.update.mockResolvedValue({ ...mockCartItem, quantity: 5, total: 500 });
      mockPrisma.cartItem.findMany.mockResolvedValue([
        { ...mockCartItem, quantity: 5, total: 500 },
      ]);
      mockPrisma.cart.update.mockResolvedValue({
        ...mockCart,
        subtotal: 500,
        total: 500,
        items: [{ ...mockCartItem, quantity: 5, total: 500 }],
      });

      const result = await service.updateItem('cart-1', 'prod-1', { quantity: 5 });

      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: mockCartItem.id },
        data: { quantity: 5, total: 500, variant: undefined },
      });
      expect(result.total).toBe(500);
    });
  });

  describe('removeItem', () => {
    it('should delete item and recalculate cart', async () => {
      mockPrisma.cartItem.delete.mockResolvedValue(mockCartItem);
      mockPrisma.cartItem.findMany.mockResolvedValue([]);
      mockPrisma.cart.update.mockResolvedValue({ ...mockCart, subtotal: 0, total: 0, items: [] });

      const result = await service.removeItem('cart-1', 'prod-1');

      expect(prisma.cartItem.delete).toHaveBeenCalledWith({
        where: { cartId_productId: { cartId: 'cart-1', productId: 'prod-1' } },
      });
      expect(result.subtotal).toBe(0);
    });
  });

  describe('clearCart', () => {
    it('should delete all items and recalculate', async () => {
      mockPrisma.cartItem.deleteMany.mockResolvedValue({ count: 3 });
      mockPrisma.cartItem.findMany.mockResolvedValue([]);
      mockPrisma.cart.update.mockResolvedValue({ ...mockCart, subtotal: 0, total: 0, items: [] });

      const result = await service.clearCart('cart-1');

      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({ where: { cartId: 'cart-1' } });
      expect(result.subtotal).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe('checkout', () => {
    const mockCartWithItems = {
      ...mockCart,
      subtotal: 200,
      total: 200,
      items: [mockCartItem],
      store: { id: 'store-1', slug: 'test-store', name: 'Test Store' },
    };

    it('should throw BadRequestException when cart is empty', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue({ ...mockCart, items: [] });

      await expect(
        service.checkout('cart-1', { customerEmail: 'test@test.com', shippingAddress: {} })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when cart is null', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(null);

      await expect(
        service.checkout('cart-1', { customerEmail: 'test@test.com', shippingAddress: {} })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when insufficient inventory', async () => {
      const lowInventoryProduct = { ...mockProduct, inventory: 1, trackInventory: true };
      mockPrisma.cart.findUnique.mockResolvedValue({
        ...mockCartWithItems,
        items: [{ ...mockCartItem, quantity: 5, product: lowInventoryProduct }],
      });

      await expect(
        service.checkout('cart-1', { customerEmail: 'test@test.com', shippingAddress: {} })
      ).rejects.toThrow(BadRequestException);
    });

    it('should create order, decrement inventory, and clear cart', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(mockCartWithItems);
      mockPrisma.order.create.mockResolvedValue({
        id: 'order-1',
        orderNumber: 'ORD-123',
        status: 'PENDING',
        paymentStatus: 'PENDING',
      });
      mockPrisma.product.update.mockResolvedValue(mockProduct);
      mockPrisma.cartItem.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.cartItem.findMany.mockResolvedValue([]);
      mockPrisma.cart.update.mockResolvedValue({ ...mockCart, subtotal: 0, total: 0, items: [] });

      const result = await service.checkout('cart-1', {
        customerEmail: 'customer@test.com',
        customerPhone: '+1234567890',
        shippingAddress: { street: '123 Main St', city: 'Bogota' },
      });

      expect(prisma.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          storeId: 'store-1',
          subtotal: 200,
          total: 200,
          customerEmail: 'customer@test.com',
          customerPhone: '+1234567890',
          status: 'PENDING',
          paymentStatus: 'PENDING',
          items: { create: expect.any(Array) },
        }),
      });

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { inventory: 8 },
      });

      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({ where: { cartId: 'cart-1' } });
      expect(result.orderId).toBe('order-1');
    });

    it('should not decrement inventory when trackInventory is false', async () => {
      const noTrackProduct = { ...mockProduct, trackInventory: false };
      mockPrisma.cart.findUnique.mockResolvedValue({
        ...mockCartWithItems,
        items: [{ ...mockCartItem, product: noTrackProduct }],
      });
      mockPrisma.order.create.mockResolvedValue({ id: 'order-1' });
      mockPrisma.cartItem.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.cartItem.findMany.mockResolvedValue([]);
      mockPrisma.cart.update.mockResolvedValue({ ...mockCart, subtotal: 0, total: 0, items: [] });

      await service.checkout('cart-1', {
        customerEmail: 'test@test.com',
        shippingAddress: {},
      });

      expect(prisma.product.update).not.toHaveBeenCalled();
    });
  });

  describe('mergeCart', () => {
    it('should create empty cart when guest cart does not exist', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(null);
      mockPrisma.cart.create.mockResolvedValue({ ...mockCart, userId: 'user-1', items: [] });

      const result = await service.mergeCart('nonexistent-session', 'user-1');

      expect(prisma.cart.create).toHaveBeenCalledWith({
        data: { storeId: '', userId: 'user-1' },
        include: { items: true },
      });
    });

    it('should merge guest cart items into existing user cart', async () => {
      const guestCart = {
        ...mockCart,
        sessionId: 'guest-session',
        storeId: 'store-1',
        items: [{ ...mockCartItem, id: 'g-item-1', productId: 'prod-1', quantity: 2, price: 100 }],
      };
      const userCart = {
        ...mockCart,
        userId: 'user-1',
        sessionId: null,
        storeId: 'store-1',
        items: [{ ...mockCartItem, id: 'u-item-1', productId: 'prod-1', quantity: 3, price: 100 }],
      };

      mockPrisma.cart.findUnique.mockResolvedValue(guestCart);
      mockPrisma.cart.findFirst.mockResolvedValue(userCart);
      mockPrisma.cartItem.update.mockResolvedValue({
        ...mockCartItem,
        quantity: 5,
        total: 500,
      });
      mockPrisma.cart.delete.mockResolvedValue(guestCart);
      mockPrisma.cartItem.findMany.mockResolvedValue([
        { ...mockCartItem, quantity: 5, total: 500 },
      ]);
      mockPrisma.cart.update.mockResolvedValue({
        ...userCart,
        subtotal: 500,
        total: 500,
        items: [{ ...mockCartItem, quantity: 5, total: 500 }],
      });

      const result = await service.mergeCart('guest-session', 'user-1');

      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'u-item-1' },
        data: { quantity: 5, total: 500 },
      });
      expect(prisma.cart.delete).toHaveBeenCalledWith({ where: { id: guestCart.id } });
      expect(result.total).toBe(500);
    });

    it('should create user cart and merge items when user has no cart', async () => {
      const guestCart = {
        ...mockCart,
        sessionId: 'guest-session',
        storeId: 'store-1',
        items: [{ ...mockCartItem, id: 'g-item-1', productId: 'prod-1', quantity: 2, price: 100 }],
      };

      mockPrisma.cart.findUnique.mockResolvedValue(guestCart);
      mockPrisma.cart.findFirst.mockResolvedValue(null);
      mockPrisma.cart.create.mockResolvedValue({
        ...mockCart,
        userId: 'user-1',
        storeId: 'store-1',
        items: [],
      });
      mockPrisma.cartItem.create.mockResolvedValue({ ...mockCartItem, cartId: 'user-cart' });
      mockPrisma.cart.delete.mockResolvedValue(guestCart);
      mockPrisma.cartItem.findMany.mockResolvedValue([mockCartItem]);
      mockPrisma.cart.update.mockResolvedValue({
        ...mockCart,
        userId: 'user-1',
        subtotal: 200,
        total: 200,
        items: [mockCartItem],
      });

      const result = await service.mergeCart('guest-session', 'user-1');

      expect(prisma.cart.create).toHaveBeenCalledWith({
        data: { storeId: 'store-1', userId: 'user-1' },
        include: { items: true },
      });
      expect(prisma.cartItem.create).toHaveBeenCalledWith({
        data: {
          cartId: expect.any(String),
          productId: 'prod-1',
          quantity: 2,
          price: 100,
          total: 200,
          variant: null,
        },
      });
      expect(result.total).toBe(200);
    });
  });

  describe('recalculateCart', () => {
    it('should calculate subtotal and total from items', async () => {
      const items = [
        { ...mockCartItem, id: 'i1', total: 200 },
        { ...mockCartItem, id: 'i2', total: 300, productId: 'prod-2' },
      ];
      mockPrisma.cartItem.findMany.mockResolvedValue(items);
      mockPrisma.cart.update.mockResolvedValue({
        ...mockCart,
        subtotal: 500,
        total: 500,
        items,
      });

      const cart = await (service as any).recalculateCart('cart-1');

      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: 'cart-1' },
        data: { subtotal: 500, total: 500 },
        include: expect.any(Object),
      });
      expect(cart.subtotal).toBe(500);
      expect(cart.total).toBe(500);
    });

    it('should handle empty cart', async () => {
      mockPrisma.cartItem.findMany.mockResolvedValue([]);
      mockPrisma.cart.update.mockResolvedValue({
        ...mockCart,
        subtotal: 0,
        total: 0,
        items: [],
      });

      const cart = await (service as any).recalculateCart('cart-1');

      expect(cart.subtotal).toBe(0);
      expect(cart.total).toBe(0);
    });
  });
});
