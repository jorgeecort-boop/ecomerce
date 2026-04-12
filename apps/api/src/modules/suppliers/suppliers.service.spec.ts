import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { PrismaService } from '../../config/prisma.service';

describe('SuppliersService', () => {
  let service: SuppliersService;
  let prisma: PrismaService;

  const mockPrisma = {
    supplier: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    supplierProduct: {
      findMany: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SuppliersService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<SuppliersService>(SuppliersService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  const mockSupplier = {
    id: 'sup-1',
    name: 'CJ Dropshipping',
    code: 'cjdropshipping',
    apiKey: 'api-key',
    apiSecret: 'api-secret',
    webhookUrl: 'https://webhook.example.com',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSupplierProduct = {
    id: 'sp-1',
    supplierId: 'sup-1',
    externalId: 'ext-123',
    title: 'Wireless Earbuds',
    description: 'High quality wireless earbuds',
    price: 29.99,
    costPrice: 8.5,
    images: ['img1.jpg'],
    shippingCost: 5.0,
    shippingTime: '7-15 days',
    variants: null,
    stock: 100,
    lastSyncedAt: new Date(),
    isMapped: false,
    ourProductId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('create', () => {
    it('should create a supplier', async () => {
      mockPrisma.supplier.create.mockResolvedValue(mockSupplier);

      const result = await service.create({
        name: 'CJ Dropshipping',
        code: 'cjdropshipping',
        apiKey: 'api-key',
        apiSecret: 'api-secret',
      });

      expect(prisma.supplier.create).toHaveBeenCalledWith({
        data: {
          name: 'CJ Dropshipping',
          code: 'cjdropshipping',
          apiKey: 'api-key',
          apiSecret: 'api-secret',
          webhookUrl: undefined,
          isActive: true,
        },
      });
      expect(result).toEqual(mockSupplier);
    });

    it('should default isActive to true', async () => {
      mockPrisma.supplier.create.mockResolvedValue(mockSupplier);

      await service.create({
        name: 'Test Supplier',
        code: 'test',
        apiKey: 'key',
        apiSecret: 'secret',
      });

      expect(prisma.supplier.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: true }),
        })
      );
    });

    it('should respect isActive when provided', async () => {
      mockPrisma.supplier.create.mockResolvedValue(mockSupplier);

      await service.create({
        name: 'Test Supplier',
        code: 'test',
        apiKey: 'key',
        apiSecret: 'secret',
        isActive: false,
      });

      expect(prisma.supplier.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: false }),
        })
      );
    });
  });

  describe('findAll', () => {
    it('should return active suppliers with product count', async () => {
      mockPrisma.supplier.findMany.mockResolvedValue([mockSupplier]);

      const result = await service.findAll();

      expect(result).toEqual([mockSupplier]);
      expect(prisma.supplier.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        include: { _count: { select: { products: true } } },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException when supplier does not exist', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return supplier with products', async () => {
      const supplierWithProducts = {
        ...mockSupplier,
        products: [mockSupplierProduct],
        _count: { products: 1 },
      };
      mockPrisma.supplier.findUnique.mockResolvedValue(supplierWithProducts);

      const result = await service.findById('sup-1');

      expect(result).toEqual(supplierWithProducts);
      expect(prisma.supplier.findUnique).toHaveBeenCalledWith({
        where: { id: 'sup-1' },
        include: {
          products: { take: 20, orderBy: { createdAt: 'desc' } },
          _count: { select: { products: true } },
        },
      });
    });
  });

  describe('findByCode', () => {
    it('should return supplier by code', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue(mockSupplier);

      const result = await service.findByCode('cjdropshipping');

      expect(result).toEqual(mockSupplier);
      expect(prisma.supplier.findUnique).toHaveBeenCalledWith({
        where: { code: 'cjdropshipping' },
      });
    });

    it('should return null when supplier not found', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue(null);

      const result = await service.findByCode('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when supplier does not exist', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', { name: 'New Name' })).rejects.toThrow(
        NotFoundException
      );
    });

    it('should update supplier fields', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue(mockSupplier);
      mockPrisma.supplier.update.mockResolvedValue({
        ...mockSupplier,
        name: 'Updated Name',
        isActive: false,
      });

      const result = await service.update('sup-1', {
        name: 'Updated Name',
        isActive: false,
      });

      expect(prisma.supplier.update).toHaveBeenCalledWith({
        where: { id: 'sup-1' },
        data: {
          name: 'Updated Name',
          apiKey: undefined,
          apiSecret: undefined,
          webhookUrl: undefined,
          isActive: false,
        },
      });
      expect(result.name).toBe('Updated Name');
    });
  });

  describe('delete', () => {
    it('should throw NotFoundException when supplier does not exist', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should soft delete supplier by setting isActive false', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue(mockSupplier);
      mockPrisma.supplier.update.mockResolvedValue({ ...mockSupplier, isActive: false });

      await service.delete('sup-1');

      expect(prisma.supplier.update).toHaveBeenCalledWith({
        where: { id: 'sup-1' },
        data: { isActive: false },
      });
    });
  });

  describe('findProducts', () => {
    it('should return products with pagination', async () => {
      mockPrisma.supplierProduct.findMany.mockResolvedValue([mockSupplierProduct]);
      mockPrisma.supplierProduct.count.mockResolvedValue(1);

      const result = await service.findProducts('sup-1', { page: 1, limit: 20 });

      expect(result).toEqual({ products: [mockSupplierProduct], total: 1 });
      expect(prisma.supplierProduct.findMany).toHaveBeenCalledWith({
        where: { supplierId: 'sup-1' },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should search by title and externalId', async () => {
      mockPrisma.supplierProduct.findMany.mockResolvedValue([]);
      mockPrisma.supplierProduct.count.mockResolvedValue(0);

      await service.findProducts('sup-1', { search: 'earbuds' });

      expect(prisma.supplierProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            supplierId: 'sup-1',
            OR: [
              { title: { contains: 'earbuds', mode: 'insensitive' } },
              { externalId: { contains: 'earbuds' } },
            ],
          },
        })
      );
    });

    it('should use default pagination', async () => {
      mockPrisma.supplierProduct.findMany.mockResolvedValue([]);
      mockPrisma.supplierProduct.count.mockResolvedValue(0);

      await service.findProducts('sup-1');

      expect(prisma.supplierProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 })
      );
    });
  });

  describe('syncProductFromExternal', () => {
    it('should throw NotFoundException when supplier does not exist', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue(null);

      await expect(
        service.syncProductFromExternal('nonexistent', {
          externalId: 'ext-1',
          title: 'Product',
          price: 10,
          costPrice: 5,
          images: [],
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should upsert product with external data', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue(mockSupplier);
      mockPrisma.supplierProduct.upsert.mockResolvedValue(mockSupplierProduct);

      const result = await service.syncProductFromExternal('sup-1', {
        externalId: 'ext-123',
        title: 'Wireless Earbuds',
        description: 'High quality',
        price: 29.99,
        costPrice: 8.5,
        images: ['img1.jpg'],
        shippingCost: 5.0,
        shippingTime: '7-15 days',
        variants: { color: 'black' },
        stock: 100,
      });

      expect(prisma.supplierProduct.upsert).toHaveBeenCalledWith({
        where: {
          supplierId_externalId: { supplierId: 'sup-1', externalId: 'ext-123' },
        },
        create: expect.objectContaining({
          supplierId: 'sup-1',
          externalId: 'ext-123',
          title: 'Wireless Earbuds',
          lastSyncedAt: expect.any(Date),
        }),
        update: expect.objectContaining({
          title: 'Wireless Earbuds',
          lastSyncedAt: expect.any(Date),
        }),
      });
      expect(result).toEqual(mockSupplierProduct);
    });
  });

  describe('mapToProduct', () => {
    it('should map supplier product to internal product', async () => {
      mockPrisma.supplierProduct.update.mockResolvedValue({
        ...mockSupplierProduct,
        ourProductId: 'prod-1',
        isMapped: true,
      });

      const result = await service.mapToProduct('sp-1', 'prod-1');

      expect(prisma.supplierProduct.update).toHaveBeenCalledWith({
        where: { id: 'sp-1' },
        data: { ourProductId: 'prod-1', isMapped: true },
      });
      expect(result.isMapped).toBe(true);
    });
  });
});
