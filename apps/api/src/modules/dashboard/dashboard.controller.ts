import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get dashboard stats for current user' })
  async getUserStats(@Request() req: { user: { id: string } }) {
    return this.dashboardService.getUserStats(req.user.id);
  }

  @Get('store/:storeId/stats')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get dashboard stats for specific store' })
  async getStoreStats(@Param('storeId') storeId: string) {
    return this.dashboardService.getStoreStats(storeId);
  }
}
