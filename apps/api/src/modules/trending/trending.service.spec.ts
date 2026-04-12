import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TrendingService } from './trending.service';
import { PrismaService } from '../../config/prisma.service';

describe('TrendingService', () => {
  let service: TrendingService;
  let prisma: PrismaService;

  const mockPrisma = {
    trendingProduct: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TrendingService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<TrendingService>(TrendingService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  const mockTrendingProduct = {
    id: 'trend-1',
    source: 'reddit',
    sourceUrl: 'https://reddit.com/r/test/post1',
    sourceId: 'reddit_abc123',
    title: 'Viral Product',
    description: 'A viral trending product',
    imageUrl: 'https://picsum.photos/seed/test/400/400',
    videoUrl: null,
    views: BigInt(100000),
    likes: BigInt(5000),
    hashtags: ['viral', 'trending'],
    trendScore: 75,
    isImported: false,
    importedAt: null,
    productId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('findAll', () => {
    it('should return products with total count', async () => {
      mockPrisma.trendingProduct.findMany.mockResolvedValue([mockTrendingProduct]);
      mockPrisma.trendingProduct.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result).toEqual({ products: [mockTrendingProduct], total: 1 });
      expect(mockPrisma.trendingProduct.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 20,
        orderBy: { trendScore: 'desc' },
      });
    });

    it('should filter by source', async () => {
      mockPrisma.trendingProduct.findMany.mockResolvedValue([]);
      mockPrisma.trendingProduct.count.mockResolvedValue(0);

      await service.findAll({ source: 'tiktok' });

      expect(mockPrisma.trendingProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { source: 'tiktok' },
        })
      );
    });

    it('should filter by isImported', async () => {
      mockPrisma.trendingProduct.findMany.mockResolvedValue([]);
      mockPrisma.trendingProduct.count.mockResolvedValue(0);

      await service.findAll({ isImported: true });

      expect(mockPrisma.trendingProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isImported: true },
        })
      );
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException when not found', async () => {
      mockPrisma.trendingProduct.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return trending product', async () => {
      mockPrisma.trendingProduct.findUnique.mockResolvedValue(mockTrendingProduct);

      const result = await service.findById('trend-1');

      expect(result).toEqual(mockTrendingProduct);
    });
  });

  describe('findTop', () => {
    it('should return top trending non-imported products', async () => {
      mockPrisma.trendingProduct.findMany.mockResolvedValue([mockTrendingProduct]);

      const result = await service.findTop(5);

      expect(result).toEqual([mockTrendingProduct]);
      expect(mockPrisma.trendingProduct.findMany).toHaveBeenCalledWith({
        where: { isImported: false },
        take: 5,
        orderBy: { trendScore: 'desc' },
      });
    });

    it('should use default limit of 10', async () => {
      mockPrisma.trendingProduct.findMany.mockResolvedValue([]);

      await service.findTop();

      expect(mockPrisma.trendingProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 })
      );
    });
  });

  describe('create', () => {
    it('should create trending product with calculated score', async () => {
      mockPrisma.trendingProduct.create.mockResolvedValue(mockTrendingProduct);

      const result = await service.create({
        source: 'reddit',
        sourceUrl: 'https://reddit.com/r/test',
        sourceId: 'reddit_abc',
        title: 'Viral Product',
        description: 'A viral product',
        imageUrl: 'https://img.jpg',
        views: 100000,
        likes: 5000,
        hashtags: ['viral'],
      });

      expect(mockPrisma.trendingProduct.create).toHaveBeenCalledWith({
        data: {
          source: 'reddit',
          sourceUrl: 'https://reddit.com/r/test',
          sourceId: 'reddit_abc',
          title: 'Viral Product',
          description: 'A viral product',
          imageUrl: 'https://img.jpg',
          videoUrl: undefined,
          views: BigInt(100000),
          likes: BigInt(5000),
          hashtags: ['viral'],
          trendScore: expect.any(Number),
        },
      });
      expect(result).toEqual(mockTrendingProduct);
    });

    it('should default views and likes to 0', async () => {
      mockPrisma.trendingProduct.create.mockResolvedValue(mockTrendingProduct);

      await service.create({
        source: 'tiktok',
        sourceUrl: 'https://tiktok.com/@user',
        sourceId: 'tiktok_1',
        title: 'TikTok Product',
        description: 'From TikTok',
        imageUrl: 'https://img.jpg',
      });

      expect(mockPrisma.trendingProduct.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            views: BigInt(0),
            likes: BigInt(0),
          }),
        })
      );
    });
  });

  describe('bulkCreate', () => {
    it('should create only non-existing products', async () => {
      mockPrisma.trendingProduct.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'existing' })
        .mockResolvedValueOnce(null);
      mockPrisma.trendingProduct.create.mockResolvedValue(mockTrendingProduct);

      const items = [
        {
          source: 'reddit',
          sourceUrl: 'url1',
          sourceId: 'r_1',
          title: 'P1',
          description: 'D1',
          imageUrl: 'img1',
        },
        {
          source: 'reddit',
          sourceUrl: 'url2',
          sourceId: 'r_2',
          title: 'P2',
          description: 'D2',
          imageUrl: 'img2',
        },
        {
          source: 'tiktok',
          sourceUrl: 'url3',
          sourceId: 't_1',
          title: 'P3',
          description: 'D3',
          imageUrl: 'img3',
        },
      ];

      const result = await service.bulkCreate(items);

      expect(result).toBe(2);
      expect(mockPrisma.trendingProduct.create).toHaveBeenCalledTimes(2);
    });

    it('should return 0 when all products already exist', async () => {
      mockPrisma.trendingProduct.findFirst.mockResolvedValue({ id: 'existing' });

      const result = await service.bulkCreate([
        {
          source: 'reddit',
          sourceUrl: 'url',
          sourceId: 'r_1',
          title: 'P1',
          description: 'D1',
          imageUrl: 'img',
        },
      ]);

      expect(result).toBe(0);
      expect(mockPrisma.trendingProduct.create).not.toHaveBeenCalled();
    });
  });

  describe('markAsImported', () => {
    it('should mark product as imported', async () => {
      const updated = {
        ...mockTrendingProduct,
        isImported: true,
        importedAt: expect.any(Date),
        productId: 'prod-1',
      };
      mockPrisma.trendingProduct.update.mockResolvedValue(updated);

      const result = await service.markAsImported('trend-1', 'prod-1');

      expect(mockPrisma.trendingProduct.update).toHaveBeenCalledWith({
        where: { id: 'trend-1' },
        data: { isImported: true, importedAt: expect.any(Date), productId: 'prod-1' },
      });
      expect(result.isImported).toBe(true);
    });
  });

  describe('detectTrends', () => {
    it('should return trend counts by source', async () => {
      mockPrisma.trendingProduct.groupBy.mockResolvedValue([
        { source: 'reddit', _count: { id: 15 } },
        { source: 'tiktok', _count: { id: 8 } },
      ]);

      const result = await service.detectTrends();

      expect(result).toEqual([
        { source: 'reddit', count: 15 },
        { source: 'tiktok', count: 8 },
      ]);
    });

    it('should filter by trendScore >= 50', async () => {
      mockPrisma.trendingProduct.groupBy.mockResolvedValue([]);

      await service.detectTrends();

      expect(mockPrisma.trendingProduct.groupBy).toHaveBeenCalledWith({
        by: ['source'],
        where: { trendScore: { gte: 50 } },
        _count: { id: true },
      });
    });
  });

  describe('calculateTrendScore', () => {
    it('should return higher score for higher engagement', () => {
      const score1 = (service as any).calculateTrendScore(1000000, 100000);
      const score2 = (service as any).calculateTrendScore(1000000, 10000);

      expect(score1).toBeGreaterThan(score2);
    });

    it('should return 0 when views and likes are 0', () => {
      const score = (service as any).calculateTrendScore(0, 0);
      expect(score).toBe(0);
    });

    it('should return higher score for higher volume', () => {
      const score1 = (service as any).calculateTrendScore(10000000, 500000);
      const score2 = (service as any).calculateTrendScore(100000, 5000);

      expect(score1).toBeGreaterThan(score2);
    });
  });

  describe('scrapeFromMockTikTok', () => {
    it('should create mock TikTok products', async () => {
      mockPrisma.trendingProduct.findFirst.mockResolvedValue(null);
      mockPrisma.trendingProduct.create.mockResolvedValue(mockTrendingProduct);

      const result = await service.scrapeFromTikTok();

      expect(mockPrisma.trendingProduct.create).toHaveBeenCalledTimes(10);
      expect(result).toBe(10);
    });
  });

  describe('scrapeFromMockInstagram', () => {
    it('should create mock Instagram products', async () => {
      mockPrisma.trendingProduct.findFirst.mockResolvedValue(null);
      mockPrisma.trendingProduct.create.mockResolvedValue(mockTrendingProduct);

      const result = await service.scrapeFromInstagram();

      expect(mockPrisma.trendingProduct.create).toHaveBeenCalledTimes(10);
      expect(result).toBe(10);
    });
  });
});
