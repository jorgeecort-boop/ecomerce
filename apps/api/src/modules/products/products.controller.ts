import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, Request, HttpException, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CloudinaryService } from './cloudinary.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new product' })
  async create(
    @Body() dto: CreateProductDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.productsService.create(dto.storeId, dto);
  }

  @Get('store/:storeId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all products for a store' })
  async findAllByStore(
    @Param('storeId') storeId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.productsService.findAllByStore(storeId, req.user.id);
  }

  @Get('store/:storeId/public')
  @ApiOperation({ summary: 'Get published products for a store (public)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findPublishedByStore(
    @Param('storeId') storeId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.productsService.findPublishedByStore(storeId, page || 1, limit || 20);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  async findOne(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update product' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, dto.storeId!, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete product' })
  async remove(@Param('id') id: string, @Body('storeId') storeId: string) {
    await this.productsService.delete(id, storeId);
    return { success: true };
  }

  @Post(':id/publish')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Publish product' })
  async publish(@Param('id') id: string, @Body('storeId') storeId: string) {
    return this.productsService.publish(id, storeId);
  }

  @Post(':id/unpublish')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Unpublish product' })
  async unpublish(@Param('id') id: string, @Body('storeId') storeId: string) {
    return this.productsService.unpublish(id, storeId);
  }

  // ── Image Upload ────────────────────────────────────────────────────────

  @Post('upload/url')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Upload product image from URL (e.g. supplier image)' })
  async uploadImageFromUrl(
    @Body('imageUrl') imageUrl: string,
    @Body('folder') folder?: string,
  ) {
    if (!imageUrl) {
      throw new HttpException('imageUrl is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const result = await this.cloudinaryService.uploadFromUrl(imageUrl, {
        folder: folder ?? 'products',
      });
      return result;
    } catch (err: any) {
      throw new HttpException(
        err.message || 'Image upload failed',
        err.status || HttpStatus.BAD_GATEWAY,
      );
    }
  }

  @Get('upload/params')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get signed upload params for direct browser-to-Cloudinary upload' })
  async getUploadParams(@Query('folder') folder?: string) {
    const params = this.cloudinaryService.getUploadParams(folder ?? 'products');
    if (!params) {
      throw new HttpException(
        'Cloudinary not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET to .env',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return params;
  }

  @Post('upload/delete')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete an uploaded image from Cloudinary' })
  async deleteImage(@Body('publicId') publicId: string) {
    if (!publicId) {
      throw new HttpException('publicId is required', HttpStatus.BAD_REQUEST);
    }
    return this.cloudinaryService.deleteImage(publicId);
  }
}
