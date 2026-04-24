import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaService } from '../../config/prisma.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: PrismaService;

  const mockPrisma = {
    store: {
      findUnique: jest.fn(),
    },
    product: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  const mockStore = {
    id: 'store-1',
    name: 'Test Store',
    slug: 'test-store',
    ownerId: 'owner-1',
  };

  const mockProduct = {
    id: 'prod-1',
    title: 'Test Product',
    description: 'A test product',
    price: 99.99,
    costPrice: 30,
    images: ['img1.jpg'],
    inventory: 50,
    trackInventory: true,
    isPublished: true,
    storeId: 'store-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('create', () => {
    it('should throw NotFoundException when store does not exist', async () => {
      mockPrisma.store.findUnique.mockResolvedValue(null);

      await expect(
        service.create('nonexistent', {
          storeId: 'store-1',
          title: 'Product',
          description: 'Desc',
          price: 100,
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should create product for store', async () => {
      mockPrisma.store.findUnique.mockResolvedValue(mockStore);
      mockPrisma.product.create.mockResolvedValue(mockProduct);

      const result = await service.create('store-1', {
        storeId: 'store-1',
        title: 'Test Product',
        description: 'A test product',
        price: 99.99,
      });

      expect(prisma.product.create).toHaveBeenCalledWith({
        data: {
          storeId: 'store-1',
          title: 'Test Product',
          description: 'A test product',
          price: 99.99,
        },
      });
      expect(result).toEqual(mockProduct);
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

    it('should return products for store owner', async () => {
      mockPrisma.store.findUnique.mockResolvedValue(mockStore);
      mockPrisma.product.findMany.mockResolvedValue([mockProduct]);

      const result = await service.findAllByStore('store-1', 'owner-1');

      expect(result).toEqual([mockProduct]);
      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: { storeId: 'store-1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findPublishedByStore', () => {
    it('should return published products with pagination', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProduct]);

      const result = await service.findPublishedByStore('store-1', 2, 10);

      expect(result).toEqual([mockProduct]);
      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: { storeId: 'store-1', isPublished: true },
        skip: 10,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should use default pagination', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);

      await service.findPublishedByStore('store-1');

      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: { storeId: 'store-1', isPublished: true },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findHomeProductCards', () => {
    it('should return homepage cards with selected fields mapped', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-home-1',
          title: 'Home Product',
          images: ['https://cdn.example.com/product-1.jpg'],
          price: 49.99,
          store: { slug: 'demo-store' },
        },
      ]);

      const result = await service.findHomeProductCards(4);

      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: {
          isPublished: true,
          store: { isActive: true },
        },
        select: {
          id: true,
          title: true,
          images: true,
          price: true,
          store: {
            select: { slug: true },
          },
        },
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        take: 4,
      });

      expect(result).toEqual([
        {
          id: 'prod-home-1',
          name: 'Home Product',
          imageUrl: 'https://cdn.example.com/product-1.jpg',
          price: 49.99,
          slug: 'demo-store/prod-home-1',
        },
      ]);
    });

    it('should fallback image when product has no image', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-home-2',
          title: 'No Image Product',
          images: [],
          price: 12.5,
          store: { slug: 'demo-store' },
        },
      ]);

      const result = await service.findHomeProductCards();

      expect(result[0].imageUrl).toBe('/placeholder-product.svg');
      expect(result[0].slug).toBe('demo-store/prod-home-2');
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException when product does not exist', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return product with store info', async () => {
      const productWithStore = {
        ...mockProduct,
        store: { id: 'store-1', name: 'Test Store', slug: 'test-store' },
      };
      mockPrisma.product.findUnique.mockResolvedValue(productWithStore);

      const result = await service.findById('prod-1');

      expect(result).toEqual(productWithStore);
      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        include: {
          store: {
            select: { id: true, name: true, slug: true },
          },
        },
      });
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when product does not exist', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', 'store-1', { title: 'New Title' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when product does not belong to store', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ ...mockProduct, storeId: 'other-store' });

      await expect(service.update('prod-1', 'store-1', { title: 'New Title' })).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should update product for store owner', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.product.update.mockResolvedValue({
        ...mockProduct,
        title: 'Updated Product',
        price: 149.99,
      });

      const result = await service.update('prod-1', 'store-1', {
        title: 'Updated Product',
        price: 149.99,
      });

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { title: 'Updated Product', price: 149.99 },
      });
      expect(result.title).toBe('Updated Product');
    });
  });

  describe('delete', () => {
    it('should throw NotFoundException when product does not exist', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.delete('nonexistent', 'store-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when product does not belong to store', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ ...mockProduct, storeId: 'other-store' });

      await expect(service.delete('prod-1', 'store-1')).rejects.toThrow(ForbiddenException);
    });

    it('should delete product for store owner', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.product.delete.mockResolvedValue(mockProduct);

      await service.delete('prod-1', 'store-1');

      expect(prisma.product.delete).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
      });
    });
  });

  describe('publish', () => {
    it('should set isPublished to true', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.product.update.mockResolvedValue({ ...mockProduct, isPublished: true });

      const result = await service.publish('prod-1', 'store-1');

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { isPublished: true },
      });
      expect(result.isPublished).toBe(true);
    });
  });

  describe('unpublish', () => {
    it('should set isPublished to false', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.product.update.mockResolvedValue({ ...mockProduct, isPublished: false });

      const result = await service.unpublish('prod-1', 'store-1');

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { isPublished: false },
      });
      expect(result.isPublished).toBe(false);
    });
  });
});
