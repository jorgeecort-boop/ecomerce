import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DashboardUnifiedService } from './dashboard-unified.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('dashboard-unified')
@Controller('dashboard/unified')
@UseGuards(JwtAuthGuard)
export class DashboardUnifiedController {
  constructor(private readonly dashboardUnifiedService: DashboardUnifiedService) {}

  @Get('stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get unified dashboard stats (Ecomerce + Shopify + Suppliers)' })
  @ApiQuery({ name: 'storeId', required: false })
  async getUnifiedStats(
    @Request() req: { user: { id: string } },
    @Query('storeId') storeId?: string
  ) {
    return this.dashboardUnifiedService.getUnifiedStats(req.user.id, storeId);
  }

  @Get('orders')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get unified orders (Ecomerce + Shopify + Suppliers)' })
  @ApiQuery({ name: 'storeId', required: false })
  @ApiQuery({ name: 'status', required: false })
  async getUnifiedOrders(
    @Request() req: { user: { id: string } },
    @Query('storeId') storeId?: string,
    @Query('status') status?: string
  ) {
    return this.dashboardUnifiedService.getUnifiedOrders(req.user.id, storeId, status);
  }

  @Get('inventory')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get inventory status across all products' })
  @ApiQuery({ name: 'storeId', required: false })
  async getInventoryStatus(@Query('storeId') storeId?: string) {
    return this.dashboardUnifiedService.getInventoryStatus(storeId);
  }

  @Get('revenue')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get revenue by day for last N days' })
  @ApiQuery({ name: 'storeId', required: true })
  @ApiQuery({ name: 'days', required: false })
  async getRevenueByDay(@Query('storeId') storeId: string, @Query('days') days?: number) {
    return this.dashboardUnifiedService.getRevenueByDay(storeId, days ? Number(days) : 7);
  }
}
