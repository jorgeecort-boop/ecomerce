import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { CouponsService } from '../coupons/coupons.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private couponsService: CouponsService,
  ) {}

  async create(dto: CreateOrderDto): Promise<any> {
    const store = await this.prisma.store.findUnique({ where: { id: dto.storeId } });
    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const subtotal = dto.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shippingCost = dto.shippingCost || 0;
    const tax = dto.tax || 0;
    const total = subtotal + shippingCost + tax;

    const orderCount = await this.prisma.order.count({
      where: { storeId: dto.storeId },
    });
    const orderNumber = `${store.slug.toUpperCase()}-${String(orderCount + 1).padStart(6, '0')}`;

    return this.prisma.order.create({
      data: {
        orderNumber,
        storeId: dto.storeId,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        items: {
          create: dto.items.map((item) => ({
            product: { connect: { id: item.productId } },
            quantity: item.quantity,
            price: new Prisma.Decimal(item.price),
            total: new Prisma.Decimal(item.price * item.quantity),
            title: item.title || 'Unknown Product',
            sku: item.sku,
            imageUrl: item.imageUrl,
          })),
        },
        subtotal: new Prisma.Decimal(subtotal),
        shippingCost: new Prisma.Decimal(shippingCost),
        tax: new Prisma.Decimal(tax),
        total: new Prisma.Decimal(total),
        customerEmail: dto.customerEmail,
        customerPhone: dto.customerPhone,
        shippingAddress: dto.shippingAddress as any,
        billingAddress: dto.billingAddress as any,
        notes: dto.notes,
      },
      include: {
        items: true,
        store: {
          select: { id: true, name: true, slug: true },
        },
      },
    });
  }

  async findAllByStore(
    storeId: string,
    userId: string,
    page = 1,
    limit = 20,
    status?: string,
  ): Promise<{ data: any[]; total: number; page: number; totalPages: number }> {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException('Store not found');
    if (store.ownerId !== userId) throw new ForbiddenException('You do not own this store');

    const where: any = { storeId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          createdAt: true,
          paymentStatus: true,
          customerEmail: true,
          customerPhone: true,
          items: {
            select: {
              id: true,
              quantity: true,
              price: true,
              title: true,
              imageUrl: true,
              // Removed nested product include to prevent N+1 and over-fetching
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<any> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        store: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async updateStatus(id: string, userId: string, dto: UpdateOrderDto): Promise<any> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { store: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.store.ownerId !== userId) {
      throw new ForbiddenException('You do not own this store');
    }

    return this.prisma.order.update({
      where: { id },
      data: {
        status: dto.status,
        trackingNumber: dto.trackingNumber,
        trackingUrl: dto.trackingUrl,
        notes: dto.notes,
      },
      include: {
        items: true,
        store: true,
      },
    });
  }

  async confirmPayment(orderId: string, stripePaymentId: string): Promise<any> {
    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: PaymentStatus.PAID,
        stripePaymentId,
        paidAt: new Date(),
        status: OrderStatus.CONFIRMED,
      },
      include: {
        items: true,
        store: true,
      },
    });
  }

  async updateAfterSupplierShip(
    orderId: string,
    supplierOrderId: string,
    trackingNumber: string,
    trackingUrl: string
  ): Promise<any> {
    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.SHIPPED,
        supplierOrderId,
        trackingNumber,
        trackingUrl,
        shippedAt: new Date(),
      },
      include: {
        items: true,
        store: true,
      },
    });
  }

  async getStats(storeId: string, userId: string): Promise<any> {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      throw new NotFoundException('Store not found');
    }
    if (store.ownerId !== userId) {
      throw new ForbiddenException('You do not own this store');
    }

    const [totalOrders, pendingOrders, paidOrders, shippedOrders] = await Promise.all([
      this.prisma.order.count({ where: { storeId } }),
      this.prisma.order.count({ where: { storeId, status: OrderStatus.PENDING } }),
      this.prisma.order.count({ where: { storeId, paymentStatus: PaymentStatus.PAID } }),
      this.prisma.order.count({ where: { storeId, status: OrderStatus.SHIPPED } }),
    ]);

    const revenue = await this.prisma.order.aggregate({
      where: { storeId, paymentStatus: PaymentStatus.PAID },
      _sum: { total: true },
    });

    return {
      totalOrders,
      pendingOrders,
      paidOrders,
      shippedOrders,
      totalRevenue: revenue._sum.total || 0,
    };
  }

  async findByCustomerEmail(email: string): Promise<any[]> {
    return this.prisma.order.findMany({
      where: { customerEmail: email },
      include: {
        items: {
          select: {
            id: true,
            quantity: true,
            price: true,
            title: true,
            imageUrl: true,
          },
        },
        store: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async validateGuestShipping(
    storeSlug: string,
    shippingAddress: {
      firstName?: string;
      lastName?: string;
      email?: string;
      address?: string;
      city?: string;
      postalCode?: string;
      country?: string;
    }
  ): Promise<{ valid: true }> {
    const store = await this.prisma.store.findFirst({
      where: { slug: storeSlug, isActive: true },
      select: { id: true },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const requiredFields = [
      shippingAddress.firstName,
      shippingAddress.lastName,
      shippingAddress.email,
      shippingAddress.address,
      shippingAddress.city,
      shippingAddress.postalCode,
      shippingAddress.country,
    ];

    const hasMissingRequiredField = requiredFields.some((field) => !field?.trim());
    if (hasMissingRequiredField) {
      throw new BadRequestException('Shipping information is incomplete');
    }

    return { valid: true };
  }

  async trackByOrderNumber(
    orderNumber: string,
    email: string,
  ): Promise<{
    orderNumber: string;
    status: string;
    statusLabel: string;
    paymentStatus: string;
    total: number;
    currency: string;
    createdAt: string;
    items: Array<{ title: string; quantity: number; price: number }>;
    trackingNumber?: string;
    trackingUrl?: string;
  }> {
    if (!email) {
      throw new BadRequestException('Email is required for order lookup');
    }

    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: {
          select: { title: true, quantity: true, price: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.customerEmail?.toLowerCase() !== email.toLowerCase()) {
      throw new NotFoundException('Order not found');
    }

    const STATUS_LABELS: Record<string, string> = {
      PENDING: 'Pendiente',
      CONFIRMED: 'Confirmado',
      PROCESSING: 'Procesando',
      SHIPPED: 'Enviado',
      DELIVERED: 'Entregado',
      CANCELLED: 'Cancelado',
      REFUNDED: 'Reembolsado',
    };

    return {
      orderNumber: order.orderNumber,
      status: order.status,
      statusLabel: STATUS_LABELS[order.status] || order.status,
      paymentStatus: order.paymentStatus,
      total: Number(order.total),
      currency: order.currency,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((it) => ({
        title: it.title || 'Producto',
        quantity: it.quantity,
        price: Number(it.price),
      })),
      trackingNumber: order.trackingNumber || undefined,
      trackingUrl: order.trackingUrl || undefined,
    };
  }

  async createGuestOrder(dto: any): Promise<any> {
    const store = await this.prisma.store.findUnique({ where: { slug: dto.storeSlug } });
    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const orderCount = await this.prisma.order.count({
      where: { storeId: store.id },
    });
    const orderNumber = `${store.slug.toUpperCase()}-${String(orderCount + 1).padStart(6, '0')}`;

    const isPaid = dto.paymentStatus === 'PAID';

    let discountAmount = 0;
    let couponId: string | undefined;
    if (dto.couponCode && dto.subtotal) {
      const couponResult = await this.couponsService.validate(store.id, {
        code: dto.couponCode,
        orderTotal: dto.subtotal,
      });
      if (couponResult.valid) {
        discountAmount = couponResult.discountAmount;
        couponId = couponResult.couponId;
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          storeId: store.id,
          status: isPaid ? OrderStatus.CONFIRMED : OrderStatus.PENDING,
          paymentStatus: isPaid ? PaymentStatus.PAID : PaymentStatus.PENDING,
          items: {
            create: dto.items.map((item: any) => ({
              product: { connect: { id: item.productId } },
              quantity: item.quantity,
              price: new Prisma.Decimal(item.price),
              total: new Prisma.Decimal(item.price * item.quantity),
              title: item.title || 'Producto',
            })),
          },
          subtotal: new Prisma.Decimal(dto.subtotal || 0),
          shippingCost: new Prisma.Decimal(dto.shippingCost || 0),
          tax: new Prisma.Decimal(dto.tax || 0),
          total: new Prisma.Decimal(Math.max(0, dto.total - discountAmount)),
          currency: dto.currency || 'COP',
          customerEmail: dto.customerEmail,
          customerPhone: dto.customerPhone,
          shippingAddress: dto.shippingAddress,
          notes: discountAmount > 0
            ? `Coupon ${dto.couponCode}: -$${discountAmount.toFixed(2)}${dto.notes ? ` | ${dto.notes}` : ''}`
            : (dto.notes ?? null),
          ...(isPaid && {
            stripePaymentId: dto.paymentIntentId,
            paidAt: new Date(),
          }),
        },
        include: {
          items: true,
          store: {
            select: { id: true, name: true, slug: true },
          },
        },
      });

      if (isPaid && dto.paymentIntentId) {
        await tx.payment.create({
          data: {
            orderId: order.id,
            stripePaymentIntentId: dto.paymentIntentId,
            amount: new Prisma.Decimal(dto.total),
            currency: dto.currency || 'COP',
            status: 'PAID',
            method: 'mercadopago',
          },
        });
      }

      if (isPaid) {
        for (const item of dto.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { inventory: { decrement: item.quantity } },
          });
        }
        if (couponId) {
          await this.couponsService.redeem(couponId);
        }
      }

      return order;
    });
  }
}
