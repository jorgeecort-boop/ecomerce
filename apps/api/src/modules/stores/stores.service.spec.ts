import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { StoresService } from './stores.service';
import { PrismaService } from '../../config/prisma.service';
import * as utils from '@ecomerce/utils';

jest.mock('@ecomerce/utils', () => ({
  slugify: jest.fn((text: string) =>
    text
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
  ),
}));

describe('StoresService', () => {
  let service: StoresService;
  let prisma: PrismaService;

  const mockPrisma = {
    store: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StoresService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<StoresService>(StoresService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  const mockStore = {
    id: 'store-1',
    name: 'My Store',
    slug: 'my-store',
    logoUrl: null,
    domain: null,
    ownerId: 'owner-1',
    isActive: true,
    settings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('create', () => {
    it('should create store with provided slug', async () => {
      mockPrisma.store.create.mockResolvedValue(mockStore);

      const result = await service.create('owner-1', {
        name: 'My Store',
        slug: 'custom-slug',
      });

      expect(prisma.store.create).toHaveBeenCalledWith({
        data: {
          name: 'My Store',
          slug: 'custom-slug',
          ownerId: 'owner-1',
        },
      });
      expect(result).toEqual(mockStore);
    });

    it('should generate slug from name when not provided', async () => {
      mockPrisma.store.create.mockResolvedValue(mockStore);

      await service.create('owner-1', {
        name: 'My Store',
      });

      expect(utils.slugify).toHaveBeenCalledWith('My Store');
      expect(prisma.store.create).toHaveBeenCalledWith({
        data: {
          name: 'My Store',
          slug: 'my-store',
          ownerId: 'owner-1',
        },
      });
    });
  });

  describe('findAllByUser', () => {
    it('should return active stores for user', async () => {
      const stores = [mockStore, { ...mockStore, id: 'store-2', name: 'Store 2' }];
      mockPrisma.store.findMany.mockResolvedValue(stores);

      const result = await service.findAllByUser('owner-1');

      expect(result).toEqual(stores);
      expect(prisma.store.findMany).toHaveBeenCalledWith({
        where: { ownerId: 'owner-1', isActive: true },
        include: {
          _count: {
            select: { products: true, orders: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when user has no stores', async () => {
      mockPrisma.store.findMany.mockResolvedValue([]);

      const result = await service.findAllByUser('owner-1');

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException when store does not exist', async () => {
      mockPrisma.store.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return store with owner and counts', async () => {
      const storeWithDetails = {
        ...mockStore,
        owner: { id: 'owner-1', email: 'owner@test.com', name: 'Owner' },
        _count: { products: 10, orders: 5 },
      };
      mockPrisma.store.findUnique.mockResolvedValue(storeWithDetails);

      const result = await service.findById('store-1');

      expect(result).toEqual(storeWithDetails);
      expect(prisma.store.findUnique).toHaveBeenCalledWith({
        where: { id: 'store-1' },
        include: {
          owner: {
            select: { id: true, email: true, name: true },
          },
          _count: {
            select: { products: true, orders: true },
          },
        },
      });
    });
  });

  describe('findBySlug', () => {
    it('should throw NotFoundException when store does not exist', async () => {
      mockPrisma.store.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return active store with published products', async () => {
      const storeWithProducts = {
        ...mockStore,
        owner: { id: 'owner-1', email: 'owner@test.com', name: 'Owner' },
        products: [
          { id: 'p1', title: 'Product 1', isPublished: true },
          { id: 'p2', title: 'Product 2', isPublished: true },
        ],
      };
      mockPrisma.store.findUnique.mockResolvedValue(storeWithProducts);

      const result = await service.findBySlug('my-store');

      expect(result).toEqual(storeWithProducts);
      expect(prisma.store.findUnique).toHaveBeenCalledWith({
        where: { slug: 'my-store', isActive: true },
        include: {
          owner: {
            select: { id: true, email: true, name: true },
          },
          products: {
            where: { isPublished: true },
            take: 20,
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when store does not exist', async () => {
      mockPrisma.store.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', 'owner-1', { name: 'New Name' })).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when user does not own store', async () => {
      mockPrisma.store.findUnique.mockResolvedValue(mockStore);

      await expect(service.update('store-1', 'other-user', { name: 'New Name' })).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should update store for owner', async () => {
      mockPrisma.store.findUnique.mockResolvedValue(mockStore);
      mockPrisma.store.update.mockResolvedValue({
        ...mockStore,
        name: 'Updated Store',
      });

      const result = await service.update('store-1', 'owner-1', {
        name: 'Updated Store',
      });

      expect(prisma.store.update).toHaveBeenCalledWith({
        where: { id: 'store-1' },
        data: { name: 'Updated Store' },
      });
      expect(result.name).toBe('Updated Store');
    });
  });

  describe('delete', () => {
    it('should throw NotFoundException when store does not exist', async () => {
      mockPrisma.store.findUnique.mockResolvedValue(null);

      await expect(service.delete('nonexistent', 'owner-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own store', async () => {
      mockPrisma.store.findUnique.mockResolvedValue(mockStore);

      await expect(service.delete('store-1', 'other-user')).rejects.toThrow(ForbiddenException);
    });

    it('should soft delete store for owner', async () => {
      mockPrisma.store.findUnique.mockResolvedValue(mockStore);
      mockPrisma.store.update.mockResolvedValue({ ...mockStore, isActive: false });

      await service.delete('store-1', 'owner-1');

      expect(prisma.store.update).toHaveBeenCalledWith({
        where: { id: 'store-1' },
        data: { isActive: false },
      });
    });
  });
});
