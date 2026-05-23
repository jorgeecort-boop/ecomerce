import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { slugify } from '@ecomerce/utils';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { Store } from '@prisma/client';

@Injectable()
export class StoresService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateStoreDto): Promise<Store> {
    const slug = dto.slug || slugify(dto.name);

    return this.prisma.store.create({
      data: {
        ...dto,
        slug,
        ownerId: userId,
      },
    });
  }

  async findAllByUser(userId: string): Promise<Store[]> {
    return this.prisma.store.findMany({
      where: { ownerId: userId, isActive: true },
      include: {
        _count: {
          select: { products: true, orders: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<Store> {
    const store = await this.prisma.store.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, email: true, name: true },
        },
        _count: {
          select: { products: true, orders: true },
        },
      },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return store;
  }

  async findBySlug(slug: string): Promise<Store> {
    const store = await this.prisma.store.findUnique({
      where: { slug, isActive: true },
      include: {
        owner: {
          select: { id: true, email: true, name: true },
        },
        products: {
          where: { isPublished: true },
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return store;
  }

  async update(id: string, userId: string, dto: UpdateStoreDto): Promise<Store> {
    const store = await this.prisma.store.findUnique({ where: { id } });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    if (store.ownerId !== userId) {
      throw new ForbiddenException('You do not own this store');
    }

    return this.prisma.store.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    const store = await this.prisma.store.findUnique({ where: { id } });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    if (store.ownerId !== userId) {
      throw new ForbiddenException('You do not own this store');
    }

    // Soft delete
    await this.prisma.store.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
