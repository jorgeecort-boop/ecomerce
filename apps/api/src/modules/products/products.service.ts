import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from '@ecomerce/db';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(storeId: string, dto: CreateProductDto): Promise<Product> {
    // Verify store ownership
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return this.prisma.product.create({
      data: {
        ...dto,
        storeId,
      },
    });
  }

  async findAllByStore(storeId: string, userId: string): Promise<Product[]> {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      throw new NotFoundException('Store not found');
    }
    if (store.ownerId !== userId) {
      throw new ForbiddenException('You do not own this store');
    }

    return this.prisma.product.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPublishedByStore(storeId: string, page = 1, limit = 20): Promise<Product[]> {
    return this.prisma.product.findMany({
      where: { storeId, isPublished: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        store: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(id: string, storeId: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.prisma.product.findUnique({ where: { id } });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.storeId !== storeId) {
      throw new ForbiddenException('Product does not belong to this store');
    }

    return this.prisma.product.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string, storeId: string): Promise<void> {
    const product = await this.prisma.product.findUnique({ where: { id } });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.storeId !== storeId) {
      throw new ForbiddenException('Product does not belong to this store');
    }

    await this.prisma.product.delete({ where: { id } });
  }

  async publish(id: string, storeId: string): Promise<Product> {
    return this.update(id, storeId, { isPublished: true });
  }

  async unpublish(id: string, storeId: string): Promise<Product> {
    return this.update(id, storeId, { isPublished: false });
  }
}
