import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CouponsService } from './coupons.service';
import { CreateCouponDto, ValidateCouponDto } from './dto/coupon.dto';

@ApiTags('coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post('store/:storeId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a coupon for a store' })
  async create(
    @Param('storeId') storeId: string,
    @Request() req: { user: { id: string } },
    @Body() dto: CreateCouponDto,
  ) {
    return this.couponsService.create(storeId, req.user.id, dto);
  }

  @Get('store/:storeId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List all coupons for a store' })
  async findAll(
    @Param('storeId') storeId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.couponsService.findAllByStore(storeId, req.user.id);
  }

  @Post('store/:storeId/validate')
  @ApiOperation({ summary: 'Validate a coupon code (public — used at checkout)' })
  async validate(
    @Param('storeId') storeId: string,
    @Body() dto: ValidateCouponDto,
  ) {
    return this.couponsService.validate(storeId, dto);
  }

  @Patch(':id/deactivate/store/:storeId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Deactivate a coupon' })
  async deactivate(
    @Param('id') id: string,
    @Param('storeId') storeId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.couponsService.deactivate(id, storeId, req.user.id);
  }
}
