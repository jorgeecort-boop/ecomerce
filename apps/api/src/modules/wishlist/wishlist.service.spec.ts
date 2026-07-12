import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { PrismaService } from '../../config/prisma.service';

type PrismaMock = {
  product: { findUnique: jest.MockedFunction<any> };
  wishlist: { findUnique: jest.MockedFunction<any>; upsert: jest.MockedFunction<any> };
  wishlistItem: {
    findUnique: jest.MockedFunction<any>;
    create: jest.MockedFunction<any>;
    delete: jest.MockedFunction<any>;
    deleteMany: jest.MockedFunction<any>;
  };
};

describe('WishlistService', () => {
  let service: WishlistService;
  let prisma: PrismaMock;

  const userId = 'user-1';
  const storeId = 'store-1';
  const productId = 'product-1';

  beforeEach(async () => {
    const prismaMock: PrismaMock = {
      product: { findUnique: jest.fn() },
      wishlist: { findUnique: jest.fn(), upsert: jest.fn() },
      wishlistItem: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WishlistService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<WishlistService>(WishlistService);
    prisma = module.get(PrismaService) as unknown as PrismaMock;
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getWishlist', () => {
    it('should return wishlist when exists', async () => {
      const expected = {
        id: 'w-1',
        userId,
        storeId,
        items: [{ id: 'wi-1', productId, product: { id: productId, title: 'Test', price: 100, images: [], isPublished: true } }],
      };
      prisma.wishlist.findUnique.mockResolvedValue(expected);

      const result = await service.getWishlist(userId, storeId);

      expect(result).toEqual(expected);
    });

    it('should return empty wishlist when not exists', async () => {
      prisma.wishlist.findUnique.mockResolvedValue(null);

      const result = await service.getWishlist(userId, storeId);

      expect(result).toEqual({ id: null, userId, storeId, items: [] });
    });
  });

  describe('addItem', () => {
    it('should add item to wishlist', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: productId });
      prisma.wishlist.upsert.mockResolvedValue({ id: 'w-1', userId, storeId });
      prisma.wishlistItem.findUnique.mockResolvedValue(null);
      prisma.wishlistItem.create.mockResolvedValue({ id: 'wi-1' });
      prisma.wishlist.findUnique.mockResolvedValue({
        id: 'w-1',
        userId,
        storeId,
        items: [{ id: 'wi-1', productId, product: { id: productId, title: 'Test', price: 100, images: [], isPublished: true } }],
      });

      const result = await service.addItem(userId, storeId, productId);

      expect(result.items).toHaveLength(1);
      expect(prisma.wishlistItem.create).toHaveBeenCalledWith({
        data: { wishlistId: 'w-1', productId },
      });
    });

    it('should not duplicate items', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: productId });
      prisma.wishlist.upsert.mockResolvedValue({ id: 'w-1', userId, storeId });
      prisma.wishlistItem.findUnique.mockResolvedValue({ id: 'wi-1' });

      await service.addItem(userId, storeId, productId);

      expect(prisma.wishlistItem.create).not.toHaveBeenCalled();
    });

    it('should throw when product not found', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.addItem(userId, storeId, productId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeItem', () => {
    it('should remove item from wishlist', async () => {
      prisma.wishlist.findUnique.mockResolvedValue({ id: 'w-1', userId, storeId });
      prisma.wishlistItem.findUnique.mockResolvedValue({ id: 'wi-1' });
      prisma.wishlist.findUnique.mockResolvedValue({
        id: 'w-1', userId, storeId, items: [],
      });

      const result = await service.removeItem(userId, storeId, productId);

      expect(result.items).toHaveLength(0);
      expect(prisma.wishlistItem.delete).toHaveBeenCalledWith({ where: { id: 'wi-1' } });
    });

    it('should throw when wishlist not found', async () => {
      prisma.wishlist.findUnique.mockResolvedValue(null);

      await expect(service.removeItem(userId, storeId, productId)).rejects.toThrow(NotFoundException);
    });

    it('should throw when item not in wishlist', async () => {
      prisma.wishlist.findUnique.mockResolvedValue({ id: 'w-1' });
      prisma.wishlistItem.findUnique.mockResolvedValue(null);

      await expect(service.removeItem(userId, storeId, productId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('clearWishlist', () => {
    it('should clear all items', async () => {
      prisma.wishlist.findUnique.mockResolvedValue({ id: 'w-1' });

      const result = await service.clearWishlist(userId, storeId);

      expect(result).toEqual({ cleared: true });
      expect(prisma.wishlistItem.deleteMany).toHaveBeenCalledWith({
        where: { wishlistId: 'w-1' },
      });
    });

    it('should not fail when wishlist does not exist', async () => {
      prisma.wishlist.findUnique.mockResolvedValue(null);

      const result = await service.clearWishlist(userId, storeId);

      expect(result).toEqual({ cleared: true });
    });
  });
});
