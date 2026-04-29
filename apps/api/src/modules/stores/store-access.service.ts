import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class StoreAccessService {
  private readonly logger = new Logger(StoreAccessService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getUserStoreIds(userId: string): Promise<string[]> {
    const cacheKey = `user:${userId}:storeIds`;
    const cached = await this.cacheManager.get<string[]>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for user ${userId} store IDs`);
      return cached;
    }

    const stores = await this.prisma.store.findMany({
      where: { ownerId: userId, isActive: true },
      select: { id: true },
    });

    const storeIds = stores.map(s => s.id);
    await this.cacheManager.set(cacheKey, storeIds, 300);

    return storeIds;
  }

  async getAccessibleStoreIds(userId?: string, storeId?: string): Promise<string[]> {
    if (storeId) return [storeId];
    if (userId) return this.getUserStoreIds(userId);
    return [];
  }

  async invalidateUserStoreCache(userId: string): Promise<void> {
    await this.cacheManager.del(`user:${userId}:storeIds`);
  }

  async hasUserAccessToStore(userId: string, storeId: string): Promise<boolean> {
    const storeIds = await this.getUserStoreIds(userId);
    return storeIds.includes(storeId);
  }
}
