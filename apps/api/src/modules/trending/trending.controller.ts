import { Controller, Get, Post, Body, Param, Query, UseGuards, Inject } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TrendingService } from './trending.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateTrendingDto, ImportTrendingDto } from './dto/create-trending.dto';
import { PrismaService } from '../../config/prisma.service';

@ApiTags('trending')
@Controller('trending')
export class TrendingController {
  constructor(
    private readonly trendingService: TrendingService,
    private readonly prisma: PrismaService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all trending products' })
  @ApiQuery({ name: 'source', required: false, enum: ['tiktok', 'instagram', 'pinterest', 'reddit'] })
  @ApiQuery({ name: 'isImported', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @Query('source') source?: string,
    @Query('isImported') isImported?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.trendingService.findAll({
      source,
      isImported: isImported === 'true' ? true : isImported === 'false' ? false : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get('top')
  @ApiOperation({ summary: 'Get top trending products' })
  @ApiQuery({ name: 'limit', required: false })
  async findTop(@Query('limit') limit?: number) {
    return this.trendingService.findTop(limit ? Number(limit) : 10);
  }

  @Get('stats')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get trending statistics' })
  async getStats() {
    const trends = await this.trendingService.detectTrends();
    const total = await this.prisma.trendingProduct.count();
    const imported = await this.prisma.trendingProduct.count({ where: { isImported: true } });

    return {
      total,
      imported,
      bySource: trends,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get trending product by ID' })
  async findOne(@Param('id') id: string) {
    return this.trendingService.findById(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a trending product entry' })
  async create(@Body() dto: CreateTrendingDto) {
    return this.trendingService.create(dto);
  }

  @Post('scrape/tiktok')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Scrape trending products from TikTok' })
  @ApiQuery({ name: 'hashtags', required: false })
  async scrapeTikTok(@Query('hashtags') hashtags?: string) {
    const tags = hashtags ? hashtags.split(',') : [];
    const count = await this.trendingService.scrapeFromTikTok(tags);
    return { scraped: count };
  }

  @Post('scrape/instagram')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Scrape trending products from Instagram' })
  @ApiQuery({ name: 'hashtags', required: false })
  async scrapeInstagram(@Query('hashtags') hashtags?: string) {
    const tags = hashtags ? hashtags.split(',') : [];
    const count = await this.trendingService.scrapeFromInstagram(tags);
    return { scraped: count };
  }

  @Post('scrape/reddit')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Scrape trending products from Reddit (REAL API, no auth needed)' })
  @ApiQuery({ name: 'subreddits', required: false, description: 'Comma-separated subreddit names' })
  @ApiQuery({ name: 'time', required: false, enum: ['day', 'week', 'month'] })
  async scrapeReddit(
    @Query('subreddits') subreddits?: string,
    @Query('time') time?: 'day' | 'week' | 'month',
  ) {
    const subs = subreddits ? subreddits.split(',') : undefined;
    const count = await this.trendingService.scrapeFromReddit(subs, time || 'week');
    return { scraped: count, source: 'reddit' };
  }

  @Post('import')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Import trending product to store' })
  async import(@Body() dto: ImportTrendingDto) {
    return this.trendingService.markAsImported(dto.trendingId, dto.storeId);
  }
}
