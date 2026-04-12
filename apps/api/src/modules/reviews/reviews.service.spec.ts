import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../../config/prisma.service';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: any;

  beforeEach(async () => {
    const prismaMock = {
      product: {
        findUnique: jest.fn(),
      },
      review: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw NotFoundException if product is not found', async () => {
      // Arrange
      prisma.product.findUnique.mockResolvedValue(null);
      const dto = { productId: 'invalid-id', rating: 5, comment: 'Test' };

      // Act & Assert
      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });

    it('should create a review successfully if product exists', async () => {
      // Arrange
      const dto = { productId: 'prod-123', rating: 5, comment: 'Excelente!' };
      const expectedReview = { id: 'rev-1', ...dto, createdAt: new Date(), updatedAt: new Date() };
      
      prisma.product.findUnique.mockResolvedValue({ id: 'prod-123' });
      prisma.review.create.mockResolvedValue(expectedReview);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result).toEqual(expectedReview);
      expect(prisma.review.create).toHaveBeenCalledWith({ data: dto });
    });
  });

  describe('findAllByProduct', () => {
    it('should return reviews from prisma', async () => {
      // Arrange
      const mockReviews = [{ id: 'rev-1', productId: 'prod-1', rating: 4, comment: 'Good' }];
      prisma.review.findMany.mockResolvedValue(mockReviews);

      // Act
      const results = await service.findAllByProduct('prod-1');

      // Assert
      expect(results).toEqual(mockReviews);
      expect(prisma.review.findMany).toHaveBeenCalledWith({
        where: { productId: 'prod-1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return review when found', async () => {
      // Arrange
      const expected = { id: 'rev-xyz', productId: 'prod-123', rating: 5, comment: 'Test' };
      prisma.review.findUnique.mockResolvedValue(expected);

      // Act
      const result = await service.findOne('rev-xyz');

      // Assert
      expect(result).toEqual(expected);
    });

    it('should throw NotFoundException when not found', async () => {
      // Arrange
      prisma.review.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });
});
