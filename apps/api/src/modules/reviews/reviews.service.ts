import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateReviewDto } from './dto/create-review.dto';
import { PrismaService } from '../../config/prisma.service';
import { Review } from '@ecomerce/db';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateReviewDto): Promise<Review> {
    // Validate if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId }
    });

    if (!product) {
      throw new NotFoundException(`Producto con ID ${dto.productId} no encontrado`);
    }

    return this.prisma.review.create({
      data: dto
    });
  }

  async findAllByProduct(productId: string): Promise<Review[]> {
    return this.prisma.review.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string): Promise<Review> {
    const review = await this.prisma.review.findUnique({
      where: { id }
    });
    
    if (!review) {
      throw new NotFoundException(`Reseña con ID ${id} no encontrada`);
    }
    
    return review;
  }
}
