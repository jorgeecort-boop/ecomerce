import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { SupplierApiService, SearchResult } from './supplier-api.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SearchSupplierProductsDto, ImportSupplierProductsDto } from './dto/sync-products.dto';

@ApiTags('suppliers')
@Controller('suppliers')
export class SuppliersController {
  constructor(
    private readonly suppliersService: SuppliersService,
    private readonly supplierApiService: SupplierApiService
  ) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new supplier' })
  async create(@Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(dto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all suppliers' })
  async findAll() {
    return this.suppliersService.findAll();
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get supplier by ID' })
  async findOne(@Param('id') id: string) {
    return this.suppliersService.findById(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update supplier' })
  async update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliersService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete supplier (soft delete)' })
  async remove(@Param('id') id: string) {
    await this.suppliersService.delete(id);
    return { success: true };
  }

  @Get(':id/products')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get supplier products from database' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getProducts(
    @Param('id') id: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.suppliersService.findProducts(id, {
      search,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Post(':id/sync')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Sync products from supplier API' })
  async syncProducts(@Param('id') id: string) {
    const count = await this.supplierApiService.syncSupplierProducts(id);
    return { synced: count };
  }

  @Get('search/:code')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Search products on supplier API' })
  @ApiQuery({ name: 'query', required: true })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async searchProducts(
    @Param('code') code: string,
    @Query('query') query: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ): Promise<SearchResult> {
    return this.supplierApiService.searchProducts(
      code,
      query,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20
    );
  }

  @Post('import/:code')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Import products from supplier to store' })
  async importProducts(@Param('code') code: string, @Body() dto: ImportSupplierProductsDto) {
    return this.supplierApiService.importToStore(code, dto.externalIds, dto.storeId, dto.markup);
  }

  @Get('product/:code/:externalId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get product details from supplier API' })
  async getProductDetails(@Param('code') code: string, @Param('externalId') externalId: string) {
    return this.supplierApiService.getProductDetails(code, externalId);
  }
}
