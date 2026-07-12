import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async getWishlist(userId: string, storeId: string) {
    const wishlist = await this.prisma.wishlist.findUnique({
      where: { userId_storeId: { userId, storeId } },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                price: true,
                images: true,
                isPublished: true,
              },
            },
          },
        },
      },
    });

    return wishlist ?? { id: null, userId, storeId, items: [] };
  }

  async addItem(userId: string, storeId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Producto ${productId} no encontrado`);
    }

    const wishlist = await this.prisma.wishlist.upsert({
      where: { userId_storeId: { userId, storeId } },
      update: {},
      create: { userId, storeId },
    });

    const existing = await this.prisma.wishlistItem.findUnique({
      where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
    });

    if (!existing) {
      await this.prisma.wishlistItem.create({
        data: { wishlistId: wishlist.id, productId },
      });
    }

    return this.getWishlist(userId, storeId);
  }

  async removeItem(userId: string, storeId: string, productId: string) {
    const wishlist = await this.prisma.wishlist.findUnique({
      where: { userId_storeId: { userId, storeId } },
    });

    if (!wishlist) {
      throw new NotFoundException('Wishlist no encontrada');
    }

    const item = await this.prisma.wishlistItem.findUnique({
      where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
    });

    if (!item) {
      throw new NotFoundException('Producto no está en favoritos');
    }

    await this.prisma.wishlistItem.delete({ where: { id: item.id } });

    return this.getWishlist(userId, storeId);
  }

  async clearWishlist(userId: string, storeId: string) {
    const wishlist = await this.prisma.wishlist.findUnique({
      where: { userId_storeId: { userId, storeId } },
    });

    if (wishlist) {
      await this.prisma.wishlistItem.deleteMany({
        where: { wishlistId: wishlist.id },
      });
    }

    return { cleared: true };
  }
}
