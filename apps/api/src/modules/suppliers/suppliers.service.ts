import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Supplier, SupplierProduct } from '@prisma/client';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSupplierDto): Promise<Supplier> {
    return this.prisma.supplier.create({
      data: {
        name: dto.name,
        code: dto.code,
        apiKey: dto.apiKey,
        apiSecret: dto.apiSecret,
        webhookUrl: dto.webhookUrl,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAll(): Promise<Supplier[]> {
    return this.prisma.supplier.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string): Promise<Supplier> {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        products: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { products: true },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier;
  }

  async findByCode(code: string): Promise<Supplier | null> {
    return this.prisma.supplier.findUnique({
      where: { code },
    });
  }

  async update(id: string, dto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return this.prisma.supplier.update({
      where: { id },
      data: {
        name: dto.name,
        apiKey: dto.apiKey,
        apiSecret: dto.apiSecret,
        webhookUrl: dto.webhookUrl,
        isActive: dto.isActive,
      },
    });
  }

  async delete(id: string): Promise<void> {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    await this.prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async findProducts(
    supplierId: string,
    options?: { search?: string; page?: number; limit?: number }
  ): Promise<{ products: SupplierProduct[]; total: number }> {
    const { search, page = 1, limit = 20 } = options || {};

    const where: any = { supplierId };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { externalId: { contains: search } },
      ];
    }

    const [products, total] = await Promise.all([
      this.prisma.supplierProduct.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.supplierProduct.count({ where }),
    ]);

    return { products, total };
  }

  async syncProductFromExternal(
    supplierId: string,
    externalData: {
      externalId: string;
      title: string;
      description?: string;
      price: number;
      costPrice: number;
      images: string[];
      shippingCost?: number;
      shippingTime?: string;
      variants?: any;
      stock?: number;
    }
  ): Promise<SupplierProduct> {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId } });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return this.prisma.supplierProduct.upsert({
      where: {
        supplierId_externalId: {
          supplierId,
          externalId: externalData.externalId,
        },
      },
      create: {
        supplierId,
        externalId: externalData.externalId,
        title: externalData.title,
        description: externalData.description,
        price: externalData.price,
        costPrice: externalData.costPrice,
        images: externalData.images,
        shippingCost: externalData.shippingCost,
        shippingTime: externalData.shippingTime,
        variants: externalData.variants,
        stock: externalData.stock,
        lastSyncedAt: new Date(),
      },
      update: {
        title: externalData.title,
        description: externalData.description,
        price: externalData.price,
        costPrice: externalData.costPrice,
        images: externalData.images,
        shippingCost: externalData.shippingCost,
        shippingTime: externalData.shippingTime,
        variants: externalData.variants,
        stock: externalData.stock,
        lastSyncedAt: new Date(),
      },
    });
  }

  async mapToProduct(supplierProductId: string, productId: string): Promise<SupplierProduct> {
    return this.prisma.supplierProduct.update({
      where: { id: supplierProductId },
      data: {
        ourProductId: productId,
        isMapped: true,
      },
    });
  }
}
