import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { ShippoService } from './shippo.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly shippoService: ShippoService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order (public checkout)' })
  async create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  @Post('guest')
  @ApiOperation({ summary: 'Create order for guest checkout (after Stripe payment)' })
  async createGuestOrder(@Body() dto: any) {
    return this.ordersService.createGuestOrder(dto);
  }

  @Post('validate-shipping')
  @ApiOperation({ summary: 'Validate guest shipping information before payment step' })
  async validateShipping(
    @Body()
    dto: {
      storeSlug: string;
      shippingAddress: {
        firstName?: string;
        lastName?: string;
        email?: string;
        address?: string;
        city?: string;
        postalCode?: string;
        country?: string;
      };
    }
  ) {
    return this.ordersService.validateGuestShipping(dto.storeSlug, dto.shippingAddress);
  }

  @Get('store/:storeId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get paginated orders for a store' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  async findAllByStore(
    @Param('storeId') storeId: string,
    @Request() req: { user: { id: string } },
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
  ) {
    return this.ordersService.findAllByStore(storeId, req.user.id, +page, +limit, status);
  }

  @Get('store/:storeId/stats')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get order statistics for a store' })
  async getStats(@Param('storeId') storeId: string, @Request() req: { user: { id: string } }) {
    return this.ordersService.getStats(storeId, req.user.id);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get order by ID' })
  async findOne(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update order status' })
  async updateStatus(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateOrderDto
  ) {
    return this.ordersService.updateStatus(id, req.user.id, dto);
  }

  @Post(':id/confirm-payment')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Confirm order payment (called by Stripe webhook)' })
  async confirmPayment(@Param('id') id: string, @Body('stripePaymentId') stripePaymentId: string) {
    return this.ordersService.confirmPayment(id, stripePaymentId);
  }

  @Post(':id/supplier-shipped')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update order after supplier ships' })
  async supplierShipped(
    @Param('id') id: string,
    @Body() body: { supplierOrderId: string; trackingNumber: string; trackingUrl: string }
  ) {
    return this.ordersService.updateAfterSupplierShip(
      id,
      body.supplierOrderId,
      body.trackingNumber,
      body.trackingUrl
    );
  }

  // ── Tracking (Shippo) ─────────────────────────────────────────────────────

  @Get(':id/tracking')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get real-time tracking for an order via Shippo' })
  async getTracking(@Param('id') id: string) {
    const order = await this.ordersService.findById(id);

    // Fallback: return order tracking info even if Shippo is not configured
    const baseInfo = {
      orderId: id,
      trackingNumber: (order as any).trackingNumber ?? null,
      trackingUrl: (order as any).trackingUrl ?? null,
      status: (order as any).status ?? null,
      shippoData: null as any,
    };

    const trackingNumber = (order as any).trackingNumber;
    if (!trackingNumber) {
      return { ...baseInfo, message: 'No tracking number assigned to this order yet' };
    }

    try {
      const shippoData = await this.shippoService.getTracking(trackingNumber);
      return { ...baseInfo, shippoData };
    } catch {
      // Shippo not configured — return order data only
      return {
        ...baseInfo,
        message: 'Tracking service not configured. Add SHIPPO_API_KEY to .env',
      };
    }
  }
}
