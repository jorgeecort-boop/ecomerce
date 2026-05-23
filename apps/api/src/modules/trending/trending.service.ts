import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { CreateTrendingDto } from './dto/create-trending.dto';
import { TrendingProduct } from '@prisma/client';

/**
 * TrendingService
 *
 * Detects trending products using:
 * 1. Reddit public JSON API (NO auth needed) — r/shutupandtakemymoney, r/BuyItForLife, etc.
 * 2. Mock TikTok/Instagram as fallback  
 *
 * Reddit API is rate-limited to ~60 req/min without auth. We use public .json endpoints.
 */
@Injectable()
export class TrendingService {
  private readonly logger = new Logger(TrendingService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(options?: {
    source?: string;
    isImported?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ products: TrendingProduct[]; total: number }> {
    const { source, isImported, page = 1, limit = 20 } = options || {};

    const where: any = {};
    if (source) where.source = source;
    if (isImported !== undefined) where.isImported = isImported;

    const [products, total] = await Promise.all([
      this.prisma.trendingProduct.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { trendScore: 'desc' },
      }),
      this.prisma.trendingProduct.count({ where }),
    ]);

    return { products, total };
  }

  async findById(id: string): Promise<TrendingProduct> {
    const product = await this.prisma.trendingProduct.findUnique({
      where: { id },
    });
    if (!product) throw new NotFoundException('Trending product not found');
    return product;
  }

  async findTop(limit = 10): Promise<TrendingProduct[]> {
    return this.prisma.trendingProduct.findMany({
      where: { isImported: false },
      take: limit,
      orderBy: { trendScore: 'desc' },
    });
  }

  async create(dto: CreateTrendingDto): Promise<TrendingProduct> {
    const trendScore = this.calculateTrendScore(dto.views || 0, dto.likes || 0);
    return this.prisma.trendingProduct.create({
      data: {
        source: dto.source,
        sourceUrl: dto.sourceUrl,
        sourceId: dto.sourceId,
        title: dto.title,
        description: dto.description,
        imageUrl: dto.imageUrl,
        videoUrl: dto.videoUrl,
        views: BigInt(dto.views || 0),
        likes: BigInt(dto.likes || 0),
        hashtags: dto.hashtags || [],
        trendScore,
      },
    });
  }

  async bulkCreate(items: CreateTrendingDto[]): Promise<number> {
    let created = 0;
    for (const item of items) {
      const existing = await this.prisma.trendingProduct.findFirst({
        where: { sourceId: item.sourceId },
      });
      if (!existing) {
        await this.create(item);
        created++;
      }
    }
    return created;
  }

  async markAsImported(id: string, productId: string): Promise<TrendingProduct> {
    return this.prisma.trendingProduct.update({
      where: { id },
      data: { isImported: true, importedAt: new Date(), productId },
    });
  }

  async detectTrends(): Promise<{ source: string; count: number }[]> {
    const trends = await this.prisma.trendingProduct.groupBy({
      by: ['source'],
      where: { trendScore: { gte: 50 } },
      _count: { id: true },
    });
    return trends.map((t) => ({ source: t.source, count: t._count.id }));
  }

  // ── Reddit (REAL API — no auth needed) ────────────────────────────────────

  /**
   * Scrape trending products from Reddit public JSON endpoints.
   * These subreddits are specifically about viral/trending products.
   */
  async scrapeFromReddit(
    subreddits: string[] = [
      'shutupandtakemymoney',
      'BuyItForLife',
      'INEEEEDIT',
      'DidntKnowIWantedThat',
      'ProductPorn',
    ],
    timeFilter: 'day' | 'week' | 'month' = 'week',
    limit = 25,
  ): Promise<number> {
    this.logger.log(`Scraping Reddit: ${subreddits.join(', ')} (${timeFilter})`);

    const allItems: CreateTrendingDto[] = [];

    for (const sub of subreddits) {
      try {
        const items = await this.fetchRedditSubreddit(sub, timeFilter, limit);
        allItems.push(...items);
      } catch (err) {
        this.logger.warn(`Reddit r/${sub} failed: ${(err as Error).message}`);
      }
    }

    if (allItems.length === 0) {
      this.logger.warn('Reddit returned 0 items — falling back to mock');
      return this.scrapeFromMockTikTok();
    }

    const created = await this.bulkCreate(allItems);
    this.logger.log(`Reddit scrape complete: ${created} new items from ${allItems.length} total`);
    return created;
  }

  /**
   * Fetch top posts from a single subreddit using the public JSON API.
   * No authentication required — just add .json to any Reddit URL.
   */
  private async fetchRedditSubreddit(
    subreddit: string,
    timeFilter: string,
    limit: number,
  ): Promise<CreateTrendingDto[]> {
    const url = `https://www.reddit.com/r/${subreddit}/top.json?t=${timeFilter}&limit=${limit}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'EcomercePlatform/1.0 (Trending Product Scanner)',
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Reddit HTTP ${res.status}`);
      }

      const json = (await res.json()) as {
        data: {
          children: {
            data: {
              id: string;
              title: string;
              selftext?: string;
              url: string;
              permalink: string;
              score: number;
              ups: number;
              num_comments: number;
              thumbnail?: string;
              preview?: {
                images?: { source?: { url: string; width: number; height: number } }[];
              };
              link_flair_text?: string;
              created_utc: number;
            };
          }[];
        };
      };

      return json.data.children
        .filter((child) => {
          // Filter out self-posts and NSFW-looking thumbnails
          const d = child.data;
          return d.score > 50 && d.url && !d.url.includes('reddit.com/r/');
        })
        .map((child) => {
          const d = child.data;
          // Extract best image URL
          let imageUrl = d.thumbnail || '';
          if (d.preview?.images?.[0]?.source?.url) {
            imageUrl = d.preview.images[0].source.url.replace(/&amp;/g, '&');
          }
          if (imageUrl === 'default' || imageUrl === 'self' || imageUrl === 'nsfw') {
            imageUrl = `https://picsum.photos/seed/${d.id}/400/400`;
          }

          return {
            source: 'reddit',
            sourceUrl: `https://reddit.com${d.permalink}`,
            sourceId: `reddit_${d.id}`,
            title: d.title.slice(0, 200),
            description: (d.selftext || '').slice(0, 500) || `Trending on r/${subreddit}`,
            imageUrl,
            views: d.score + d.num_comments * 5, // approximate reach
            likes: d.ups,
            hashtags: [
              subreddit.toLowerCase(),
              'reddit',
              'trending',
              ...(d.link_flair_text ? [d.link_flair_text.toLowerCase()] : []),
            ],
          };
        });
    } finally {
      clearTimeout(timeout);
    }
  }

  // ── TikTok/Instagram mock fallback ────────────────────────────────────────

  async scrapeFromTikTok(hashtags: string[] = []): Promise<number> {
    this.logger.log(`Scraping TikTok for: ${hashtags.join(', ')}`);
    return this.scrapeFromMockTikTok(hashtags);
  }

  async scrapeFromInstagram(hashtags: string[] = []): Promise<number> {
    this.logger.log(`Scraping Instagram for: ${hashtags.join(', ')}`);
    return this.scrapeFromMockInstagram(hashtags);
  }

  // ── Score calculation ──────────────────────────────────────────────────────

  private calculateTrendScore(views: number, likes: number): number {
    const recencyHours = 24;
    const recencyFactor = Math.max(0, 1 - recencyHours / 168);
    const engagement = likes > 0 && views > 0 ? (likes / views) * 100 : 0;
    const volume = Math.min(views / 1000000, 1);
    return Math.round((engagement * 0.6 + volume * 0.4) * recencyFactor * 100);
  }

  // ── Mock generators (fallback) ────────────────────────────────────────────

  private async scrapeFromMockTikTok(hashtags: string[] = []): Promise<number> {
    const bases = ['phone case', 'bluetooth speaker', 'led lights', 'yoga mat', 'water bottle'];
    const items: CreateTrendingDto[] = Array.from({ length: 10 }, (_, i) => ({
      source: 'tiktok',
      sourceUrl: `https://www.tiktok.com/@user/video/${Math.random().toString(36).substring(7)}`,
      sourceId: `tiktok_${Date.now()}_${i}`,
      title: `${bases[i % bases.length]} - Viral Product ${i + 1}`,
      description: `Trending ${bases[i % bases.length]} with amazing engagement`,
      imageUrl: `https://picsum.photos/seed/trending${i}/400/400`,
      videoUrl: `https://example.com/video${i}.mp4`,
      views: Math.floor(Math.random() * 1000000),
      likes: Math.floor(Math.random() * 100000),
      hashtags: hashtags.length > 0 ? hashtags : ['viral', 'trending', 'dropship'],
    }));
    return this.bulkCreate(items);
  }

  private async scrapeFromMockInstagram(hashtags: string[] = []): Promise<number> {
    const bases = ['fitness gear', 'kitchen gadget', 'phone accessory', 'pet toy', 'travel item'];
    const items: CreateTrendingDto[] = Array.from({ length: 10 }, (_, i) => ({
      source: 'instagram',
      sourceUrl: `https://www.instagram.com/p/${Math.random().toString(36).substring(7)}`,
      sourceId: `instagram_${Date.now()}_${i}`,
      title: `${bases[i % bases.length]} - Instagram Trend ${i + 1}`,
      description: `Popular ${bases[i % bases.length]} on Instagram`,
      imageUrl: `https://picsum.photos/seed/insta${i}/400/400`,
      views: Math.floor(Math.random() * 500000),
      likes: Math.floor(Math.random() * 50000),
      hashtags: hashtags.length > 0 ? hashtags : ['shopping', 'trending', 'fyp'],
    }));
    return this.bulkCreate(items);
  }
}
