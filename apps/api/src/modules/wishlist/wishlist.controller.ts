import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WishlistService } from './wishlist.service';
import { AddToWishlistDto } from './dto/wishlist.dto';

@ApiTags('wishlist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get(':storeId')
  @ApiOperation({ summary: 'Get wishlist for a store' })
  async getWishlist(
    @Request() req: { user: { id: string } },
    @Param('storeId') storeId: string,
  ) {
    return this.wishlistService.getWishlist(req.user.id, storeId);
  }

  @Post(':storeId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add product to wishlist' })
  async addItem(
    @Request() req: { user: { id: string } },
    @Param('storeId') storeId: string,
    @Body() dto: AddToWishlistDto,
  ) {
    return this.wishlistService.addItem(req.user.id, storeId, dto.productId);
  }

  @Delete(':storeId/:productId')
  @ApiOperation({ summary: 'Remove product from wishlist' })
  async removeItem(
    @Request() req: { user: { id: string } },
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.removeItem(req.user.id, storeId, productId);
  }

  @Delete(':storeId')
  @ApiOperation({ summary: 'Clear entire wishlist' })
  async clearWishlist(
    @Request() req: { user: { id: string } },
    @Param('storeId') storeId: string,
  ) {
    return this.wishlistService.clearWishlist(req.user.id, storeId);
  }
}
