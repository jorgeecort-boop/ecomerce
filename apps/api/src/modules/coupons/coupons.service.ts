import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateCouponDto, ValidateCouponDto } from './dto/coupon.dto';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(storeId: string, userId: string, dto: CreateCouponDto) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException('Store not found');
    if (store.ownerId !== userId) throw new ForbiddenException('You do not own this store');

    const code = dto.code.toUpperCase().trim();

    return this.prisma.coupon.create({
      data: {
        storeId,
        code,
        description: dto.description,
        discountType: dto.discountType ?? 'PERCENTAGE',
        discountValue: new Prisma.Decimal(dto.discountValue),
        minOrderAmount: dto.minOrderAmount ? new Prisma.Decimal(dto.minOrderAmount) : null,
        maxDiscount: dto.maxDiscount ? new Prisma.Decimal(dto.maxDiscount) : null,
        usageLimit: dto.usageLimit,
        perUserLimit: dto.perUserLimit ?? 1,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });
  }

  async findAllByStore(storeId: string, userId: string) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException('Store not found');
    if (store.ownerId !== userId) throw new ForbiddenException('You do not own this store');

    return this.prisma.coupon.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Validates a coupon and returns the discount amount.
   * Does NOT increment usageCount — call `redeem()` after order is confirmed.
   */
  async validate(storeId: string, dto: ValidateCouponDto): Promise<{
    valid: boolean;
    discountAmount: number;
    couponId: string;
    message?: string;
  }> {
    const code = dto.code.toUpperCase().trim();

    const coupon = await this.prisma.coupon.findUnique({
      where: { storeId_code: { storeId, code } },
    });

    if (!coupon || !coupon.isActive) {
      return { valid: false, discountAmount: 0, couponId: '', message: 'Coupon not found or inactive' };
    }

    const now = new Date();
    if (coupon.startsAt > now) {
      return { valid: false, discountAmount: 0, couponId: coupon.id, message: 'Coupon not yet active' };
    }

    if (coupon.expiresAt && coupon.expiresAt < now) {
      return { valid: false, discountAmount: 0, couponId: coupon.id, message: 'Coupon has expired' };
    }

    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      return { valid: false, discountAmount: 0, couponId: coupon.id, message: 'Coupon usage limit reached' };
    }

    const minOrder = coupon.minOrderAmount ? Number(coupon.minOrderAmount) : 0;
    if (dto.orderTotal < minOrder) {
      return {
        valid: false,
        discountAmount: 0,
        couponId: coupon.id,
        message: `Minimum order amount is $${minOrder.toFixed(2)}`,
      };
    }

    // Calculate discount
    let discountAmount: number;
    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = (dto.orderTotal * Number(coupon.discountValue)) / 100;
      if (coupon.maxDiscount) {
        discountAmount = Math.min(discountAmount, Number(coupon.maxDiscount));
      }
    } else {
      discountAmount = Math.min(Number(coupon.discountValue), dto.orderTotal);
    }

    return {
      valid: true,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      couponId: coupon.id,
    };
  }

  /** Increments usage count after a successful order */
  async redeem(couponId: string): Promise<void> {
    await this.prisma.coupon.update({
      where: { id: couponId },
      data: { usageCount: { increment: 1 } },
    });
  }

  async deactivate(id: string, storeId: string, userId: string) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException('Store not found');
    if (store.ownerId !== userId) throw new ForbiddenException('You do not own this store');

    const coupon = await this.prisma.coupon.findFirst({ where: { id, storeId } });
    if (!coupon) throw new NotFoundException('Coupon not found');

    return this.prisma.coupon.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
