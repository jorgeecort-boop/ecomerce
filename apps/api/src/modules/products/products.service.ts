import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from '@prisma/client';

export interface HomeProductCard {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  compareAtPrice?: number;
  slug: string;
}

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(storeId: string, dto: CreateProductDto): Promise<Product> {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      throw new NotFoundException('Store not found');
    }
    return this.prisma.product.create({ data: { ...dto, storeId } });
  }

  async findAllByStore(storeId: string, userId: string): Promise<Product[]> {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException('Store not found');
    if (store.ownerId !== userId) throw new ForbiddenException('You do not own this store');
    return this.prisma.product.findMany({ where: { storeId }, orderBy: { createdAt: 'desc' } });
  }

  async findPublishedByStore(storeId: string, page = 1, limit = 20): Promise<Product[]> {
    return this.prisma.product.findMany({
      where: { storeId, isPublished: true },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        compareAtPrice: true,
        images: true,
        inventory: true,
        isPublished: true,
        isFeatured: true,
        storeId: true,
        category: true,
        tags: true,
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    } as any);
  }

  async findPublishedSummaryByStore(storeId: string, page = 1, limit = 20): Promise<Array<{
    id: string;
    title: string;
    price: number;
    slug: string;
    imageUrl?: string;
  }>> {
    const products = await this.prisma.product.findMany({
      where: { storeId, isPublished: true },
      select: {
        id: true,
        title: true,
        price: true,
        images: true,
        store: { select: { slug: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
    return products.map(p => {
      const [firstImage] = p.images ?? [];
      return {
        id: p.id,
        title: p.title,
        price: Number(p.price),
        slug: `${p.store.slug}/${p.id}`,
        imageUrl: firstImage,
      };
    });
  }

  async findHomeProductCards(limit = 8): Promise<HomeProductCard[]> {
    const products = await this.prisma.product.findMany({
      where: { isPublished: true, store: { isActive: true } },
      select: {
        id: true,
        title: true,
        images: true,
        price: true,
        compareAtPrice: true,
        store: { select: { slug: true } },
      },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });
    return products.map((product) => {
      const [firstImage] = product.images ?? [];
      return {
        id: product.id,
        name: product.title,
        imageUrl: firstImage || '/placeholder-product.svg',
        price: Number(product.price),
        compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : undefined,
        slug: `${product.store.slug}/${product.id}`,
      };
    });
  }

  async findById(id: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { store: { select: { id: true, name: true, slug: true } } },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(id: string, storeId: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    if (product.storeId !== storeId) throw new ForbiddenException('Product does not belong to this store');
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async delete(id: string, storeId: string): Promise<void> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    if (product.storeId !== storeId) throw new ForbiddenException('Product does not belong to this store');
    await this.prisma.product.delete({ where: { id } });
  }

  async publish(id: string, storeId: string): Promise<Product> {
    return this.update(id, storeId, { isPublished: true } as any);
  }

  async unpublish(id: string, storeId: string): Promise<Product> {
    return this.update(id, storeId, { isPublished: false } as any);
  }
}
