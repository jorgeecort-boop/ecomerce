import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { AddToCartDto, UpdateCartItemDto, CheckoutDto } from './dto/cart.dto';
import { Cart, CartItem, Product } from '@ecomerce/db';
import { TelegramService } from '../../common/telegram.service';

@Injectable()
export class CartService {
  constructor(
    private prisma: PrismaService,
    private telegram: TelegramService
  ) {}

  async getCart(storeId: string, sessionId?: string, userId?: string): Promise<Cart | null> {
    const where: any = { storeId };

    if (userId) {
      where.userId = userId;
    } else if (sessionId) {
      where.sessionId = sessionId;
    } else {
      return null;
    }

    return this.prisma.cart.findUnique({
      where,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                price: true,
                images: true,
                inventory: true,
                trackInventory: true,
              },
            },
          },
        },
      },
    });
  }

  async getOrCreateCart(storeId: string, sessionId?: string, userId?: string): Promise<Cart> {
    let cart = await this.getCart(storeId, sessionId, userId);

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: {
          storeId,
          sessionId,
          userId,
        },
        include: {
          items: true,
        },
      });
    }

    return cart;
  }

  async addItem(storeId: string, dto: AddToCartDto, userId?: string): Promise<Cart> {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.isPublished) {
      throw new BadRequestException('Product is not available');
    }

    const cart = await this.getOrCreateCart(storeId, dto.sessionId, userId);
    const quantity = dto.quantity || 1;

    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: dto.productId,
        },
      },
    });

    if (existingItem) {
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + quantity,
          total: Number(product.price) * (existingItem.quantity + quantity),
        },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: dto.productId,
          quantity,
          price: product.price,
          total: Number(product.price) * quantity,
          variant: dto.variant,
        },
      });
    }

    return this.recalculateCart(cart.id);
  }

  async updateItem(cartId: string, productId: string, dto: UpdateCartItemDto): Promise<Cart> {
    const item = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId,
          productId,
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    if (dto.quantity <= 0) {
      return this.removeItem(cartId, productId);
    }

    await this.prisma.cartItem.update({
      where: { id: item.id },
      data: {
        quantity: dto.quantity,
        total: Number(item.price) * dto.quantity,
        variant: dto.variant,
      },
    });

    return this.recalculateCart(cartId);
  }

  async removeItem(cartId: string, productId: string): Promise<Cart> {
    await this.prisma.cartItem.delete({
      where: {
        cartId_productId: {
          cartId,
          productId,
        },
      },
    });

    return this.recalculateCart(cartId);
  }

  async clearCart(cartId: string): Promise<Cart> {
    await this.prisma.cartItem.deleteMany({
      where: { cartId },
    });

    return this.recalculateCart(cartId);
  }

  async checkout(cartId: string, dto: CheckoutDto): Promise<{ orderId: string }> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        store: true,
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    for (const item of cart.items) {
      if (item.product.trackInventory && item.product.inventory < item.quantity) {
        throw new BadRequestException(`Insufficient inventory for product: ${item.product.title}`);
      }
    }

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    // ATOMIC TRANSACTION: Order creation + inventory update + cart cleanup
    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          storeId: cart.storeId,
          subtotal: cart.subtotal,
          shippingCost: 0,
          tax: 0,
          total: cart.total,
          shippingAddress: dto.shippingAddress || {},
          billingAddress: dto.billingAddress,
          customerEmail: dto.customerEmail,
          customerPhone: dto.customerPhone,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          items: {
            create: cart.items.map((item) => ({
              product: { connect: { id: item.productId } },
              quantity: item.quantity,
              price: item.price,
              costPrice: item.product.costPrice || item.price,
              total: item.total,
              variant: item.variant as any,
              sku: item.product.sku,
              title: item.product.title,
              imageUrl: item.product.images[0],
            })),
          },
        },
      });

      // Update inventory atomically within the same transaction
      for (const item of cart.items) {
        if (item.product.trackInventory) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              inventory: item.product.inventory - item.quantity,
            },
          });
        }
      }

      // Clear cart atomically
      await tx.cartItem.deleteMany({
        where: { cartId },
      });

      return newOrder;
    });

    await this.telegram.notifyNewOrder(
      order.orderNumber,
      Number(order.total),
      dto.customerEmail || 'Guest'
    );

    return { orderId: order.id };
  }

  private async recalculateCart(cartId: string): Promise<Cart> {
    const items = await this.prisma.cartItem.findMany({
      where: { cartId },
      include: {
        product: true,
      },
    });

    const subtotal = items.reduce((sum, item) => sum + Number(item.total), 0);

    return this.prisma.cart.update({
      where: { id: cartId },
      data: {
        subtotal,
        total: subtotal,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                price: true,
                images: true,
                inventory: true,
                trackInventory: true,
              },
            },
          },
        },
      },
    });
  }

  async mergeCart(sessionId: string, userId: string): Promise<Cart> {
    const guestCart = await this.prisma.cart.findUnique({
      where: { sessionId },
      include: { items: true },
    });

    if (!guestCart) {
      return this.getOrCreateCart('', undefined, userId);
    }

    let userCart = await this.prisma.cart.findFirst({
      where: { userId, storeId: guestCart.storeId },
      include: { items: true },
    });

    if (!userCart) {
      userCart = await this.prisma.cart.create({
        data: {
          storeId: guestCart.storeId,
          userId,
        },
        include: { items: true },
      });
    }

    for (const item of guestCart.items) {
      const existingItem = userCart.items.find((i) => i.productId === item.productId);

      if (existingItem) {
        await this.prisma.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: existingItem.quantity + item.quantity,
            total: Number(existingItem.price) * (existingItem.quantity + item.quantity),
          },
        });
      } else {
        await this.prisma.cartItem.create({
          data: {
            cartId: userCart.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            total: item.total,
            variant: item.variant as any,
          },
        });
      }
    }

    await this.prisma.cart.delete({ where: { id: guestCart.id } });

    return this.recalculateCart(userCart.id);
  }
}
