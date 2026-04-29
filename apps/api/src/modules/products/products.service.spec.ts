import { Test } from '@nestjs/testing';
import { PrismaService } from '../../config/prisma.service';
import { ProductsService } from './products.service';

describe('ProductsService - Selective Queries', () => {
  let service: ProductsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: {
            product: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            store: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('findPublishedByStore - excludes images from catalog', () => {
    it('should not select images field in catalog query', async () => {
      (prisma.product.findMany as jest.fn).mockResolvedValue([]);

      await service.findPublishedByStore('store1', 1, 20);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            id: true,
            title: true,
            description: true,
            price: true,
            compareAtPrice: true,
            inventory: true,
            isPublished: true,
            storeId: true,
            category: true,
            // images should NOT be in select
          }),
        })
      );

      // Verify images is NOT selected
      const selectObj = (prisma.product.findMany as jest.fn).mock.calls[0][0].select;
      expect(selectObj.images).toBeUndefined();
    });
  });

  describe('findPublishedSummaryByStore - optimized for listing', () => {
    it('should return summary with slug and first image only', async () => {
      (prisma.product.findMany as jest.fn).mockResolvedValue([
        {
          id: 'prod1',
          title: 'Product 1',
          price: 100,
          images: ['img1.jpg', 'img2.jpg'],
          store: { slug: 'mystore' },
        },
      ]);

      const result = await service.findPublishedSummaryByStore('store1', 1, 20);

      expect(result).toEqual([
        {
          id: 'prod1',
          title: 'Product 1',
          price: 100,
          slug: 'mystore/prod1',
          imageUrl: 'img1.jpg',
        },
      ]);

      // Verify select includes only necessary fields
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            id: true,
            title: true,
            price: true,
            images: true, // Only need images for firstImage extraction
            store: { select: { slug: true } },
          }),
        })
      );
    });
  });
});
