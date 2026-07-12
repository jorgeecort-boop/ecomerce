import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { PrismaService } from '../../config/prisma.service';
import { CreateCouponDto, ValidateCouponDto } from './dto/coupon.dto';

type PrismaMock = {
  store: { findUnique: jest.MockedFunction<any> };
  coupon: {
    create: jest.MockedFunction<any>;
    findMany: jest.MockedFunction<any>;
    findUnique: jest.MockedFunction<any>;
    findFirst: jest.MockedFunction<any>;
    update: jest.MockedFunction<any>;
  };
};

describe('CouponsService', () => {
  let service: CouponsService;
  let prisma: PrismaMock;

  const userId = 'user-1';
  const storeId = 'store-1';

  const mockStore = {
    id: storeId,
    name: 'Test Store',
    slug: 'test-store',
    ownerId: userId,
    logoUrl: null,
    domain: null,
    settings: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const prismaMock: PrismaMock = {
      store: { findUnique: jest.fn() },
      coupon: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<CouponsService>(CouponsService);
    prisma = module.get(PrismaService) as unknown as PrismaMock;
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto: CreateCouponDto = {
      code: 'SUMMER20',
      description: '20% off',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      minOrderAmount: 50,
      maxDiscount: 100,
      usageLimit: 100,
      perUserLimit: 1,
    };

    it('should create a coupon successfully', async () => {
      prisma.store.findUnique.mockResolvedValue(mockStore);
      const expected = {
        id: 'coupon-1',
        storeId,
        code: 'SUMMER20',
        discountValue: 20,
        isActive: true,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.coupon.create.mockResolvedValue(expected);

      const result = await service.create(storeId, userId, dto);

      expect(result).toEqual(expected);
      expect(prisma.store.findUnique).toHaveBeenCalledWith({ where: { id: storeId } });
      expect(prisma.coupon.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          storeId,
          code: 'SUMMER20',
          discountValue: expect.any(Object),
        }),
      });
    });

    it('should throw NotFoundException when store not found', async () => {
      prisma.store.findUnique.mockResolvedValue(null);

      await expect(service.create(storeId, userId, dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own store', async () => {
      prisma.store.findUnique.mockResolvedValue({ ...mockStore, ownerId: 'other-user' });

      await expect(service.create(storeId, userId, dto)).rejects.toThrow(ForbiddenException);
    });

    it('should uppercase and trim coupon code', async () => {
      prisma.store.findUnique.mockResolvedValue(mockStore);
      prisma.coupon.create.mockResolvedValue({ id: 'c-1' });

      await service.create(storeId, userId, { ...dto, code: '  summer20  ' });

      expect(prisma.coupon.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ code: 'SUMMER20' }),
        }),
      );
    });
  });

  describe('findAllByStore', () => {
    it('should return all coupons for store owner', async () => {
      prisma.store.findUnique.mockResolvedValue(mockStore);
      const expected = [{ id: 'c-1', storeId, code: 'SUMMER20' }];
      prisma.coupon.findMany.mockResolvedValue(expected);

      const result = await service.findAllByStore(storeId, userId);

      expect(result).toEqual(expected);
      expect(prisma.coupon.findMany).toHaveBeenCalledWith({
        where: { storeId },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw ForbiddenException for non-owner', async () => {
      prisma.store.findUnique.mockResolvedValue({ ...mockStore, ownerId: 'other-user' });

      await expect(service.findAllByStore(storeId, userId)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('validate', () => {
    const validCoupon = {
      id: 'c-1',
      storeId,
      code: 'SUMMER20',
      isActive: true,
      discountType: 'PERCENTAGE',
      discountValue: 20,
      minOrderAmount: null,
      maxDiscount: 100,
      usageLimit: null,
      usageCount: 0,
      startsAt: new Date('2020-01-01'),
      expiresAt: null,
      perUserLimit: 1,
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should validate a valid percentage coupon', async () => {
      prisma.coupon.findUnique.mockResolvedValue(validCoupon);

      const result = await service.validate(storeId, { code: 'SUMMER20', orderTotal: 200 });

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(40);
      expect(result.couponId).toBe('c-1');
    });

    it('should cap discount at maxDiscount', async () => {
      prisma.coupon.findUnique.mockResolvedValue(validCoupon);

      const result = await service.validate(storeId, { code: 'SUMMER20', orderTotal: 1000 });

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(100);
    });

    it('should return invalid for inactive coupon', async () => {
      prisma.coupon.findUnique.mockResolvedValue({ ...validCoupon, isActive: false });

      const result = await service.validate(storeId, { code: 'SUMMER20', orderTotal: 100 });

      expect(result.valid).toBe(false);
    });

    it('should return invalid for expired coupon', async () => {
      prisma.coupon.findUnique.mockResolvedValue({
        ...validCoupon,
        expiresAt: new Date('2020-01-01'),
      });

      const result = await service.validate(storeId, { code: 'SUMMER20', orderTotal: 100 });

      expect(result.valid).toBe(false);
      expect(result.message).toContain('expired');
    });

    it('should return invalid when usage limit reached', async () => {
      prisma.coupon.findUnique.mockResolvedValue({
        ...validCoupon,
        usageLimit: 10,
        usageCount: 10,
      });

      const result = await service.validate(storeId, { code: 'SUMMER20', orderTotal: 100 });

      expect(result.valid).toBe(false);
      expect(result.message).toContain('limit');
    });

    it('should validate fixed discount coupons', async () => {
      prisma.coupon.findUnique.mockResolvedValue({
        ...validCoupon,
        discountType: 'FIXED',
        discountValue: 25,
      });

      const result = await service.validate(storeId, { code: 'FLAT25', orderTotal: 100 });

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(25);
    });

    it('should not exceed order total for fixed discount', async () => {
      prisma.coupon.findUnique.mockResolvedValue({
        ...validCoupon,
        discountType: 'FIXED',
        discountValue: 50,
      });

      const result = await service.validate(storeId, { code: 'BIG50', orderTotal: 30 });

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(30);
    });
  });

  describe('redeem', () => {
    it('should increment usage count', async () => {
      prisma.coupon.update.mockResolvedValue({ id: 'c-1', usageCount: 1 });

      await service.redeem('c-1');

      expect(prisma.coupon.update).toHaveBeenCalledWith({
        where: { id: 'c-1' },
        data: { usageCount: { increment: 1 } },
      });
    });
  });

  describe('deactivate', () => {
    it('should deactivate a coupon', async () => {
      prisma.store.findUnique.mockResolvedValue(mockStore);
      prisma.coupon.findFirst.mockResolvedValue({ id: 'c-1', storeId });
      prisma.coupon.update.mockResolvedValue({ id: 'c-1', isActive: false });

      const result = await service.deactivate('c-1', storeId, userId);

      expect(result).toEqual({ id: 'c-1', isActive: false });
      expect(prisma.coupon.update).toHaveBeenCalledWith({
        where: { id: 'c-1' },
        data: { isActive: false },
      });
    });

    it('should throw ForbiddenException for non-owner', async () => {
      prisma.store.findUnique.mockResolvedValue({ ...mockStore, ownerId: 'other-user' });

      await expect(service.deactivate('c-1', storeId, userId)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when coupon not found', async () => {
      prisma.store.findUnique.mockResolvedValue(mockStore);
      prisma.coupon.findFirst.mockResolvedValue(null);

      await expect(service.deactivate('c-1', storeId, userId)).rejects.toThrow(NotFoundException);
    });
  });
});
