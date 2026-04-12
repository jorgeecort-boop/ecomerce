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
  Request,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AddToCartDto, UpdateCartItemDto, CheckoutDto } from './dto/cart.dto';

@ApiTags('cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get current cart' })
  @ApiQuery({ name: 'storeId', required: true })
  @ApiQuery({ name: 'sessionId', required: false })
  async getCart(
    @Query('storeId') storeId: string,
    @Query('sessionId') sessionId?: string,
    @Request() req?: { user?: { id: string } }
  ) {
    const userId = req?.user?.id;
    return this.cartService.getCart(storeId, sessionId, userId);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiQuery({ name: 'storeId', required: true })
  async addItem(
    @Query('storeId') storeId: string,
    @Body() dto: AddToCartDto,
    @Request() req?: { user?: { id: string } }
  ) {
    const userId = req?.user?.id;
    return this.cartService.addItem(storeId, dto, userId);
  }

  @Patch('items/:productId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiQuery({ name: 'cartId', required: true })
  async updateItem(
    @Param('productId') productId: string,
    @Query('cartId') cartId: string,
    @Body() dto: UpdateCartItemDto
  ) {
    return this.cartService.updateItem(cartId, productId, dto);
  }

  @Delete('items/:productId')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiQuery({ name: 'cartId', required: true })
  async removeItem(@Param('productId') productId: string, @Query('cartId') cartId: string) {
    return this.cartService.removeItem(cartId, productId);
  }

  @Delete(':cartId')
  @ApiOperation({ summary: 'Clear cart' })
  async clearCart(@Param('cartId') cartId: string) {
    return this.cartService.clearCart(cartId);
  }

  @Post(':cartId/checkout')
  @ApiOperation({ summary: 'Checkout - create order from cart' })
  async checkout(@Param('cartId') cartId: string, @Body() dto: CheckoutDto) {
    return this.cartService.checkout(cartId, dto);
  }

  @Post('merge')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Merge guest cart to user cart' })
  async mergeCart(@Body() body: { sessionId: string }, @Request() req: { user: { id: string } }) {
    return this.cartService.mergeCart(body.sessionId, req.user.id);
  }
}
