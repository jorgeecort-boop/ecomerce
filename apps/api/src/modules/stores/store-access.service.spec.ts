import { Test } from '@nestjs/testing';
import { PrismaService } from '../../config/prisma.service';
import { StoreAccessService } from './store-access.service';
import { Cache } from 'cache-manager';

describe('StoreAccessService - Caching and DRY', () => {
  let service: StoreAccessService;
  let prisma: PrismaService;
  let cache: Cache;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        StoreAccessService,
        {
          provide: PrismaService,
          useValue: {
            store: {
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: 'CACHE_MANAGER',
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<StoreAccessService>(StoreAccessService);
    prisma = module.get<PrismaService>(PrismaService);
    cache = module.get('CACHE_MANAGER');
  });

  describe('getUserStoreIds - caching behavior', () => {
    it('should return cached store IDs on cache hit', async () => {
      const cachedIds = ['store1', 'store2'];
      (cache.get as jest.fn).mockResolvedValue(cachedIds);

      const result = await service.getUserStoreIds('user1');

      expect(cache.get).toHaveBeenCalledWith('user:user1:storeIds');
      expect(prisma.store.findMany).not.toHaveBeenCalled();
      expect(result).toEqual(cachedIds);
    });

    it('should query database and cache on cache miss', async () => {
      (cache.get as jest.fn).mockResolvedValue(null);
      (prisma.store.findMany as jest.fn).mockResolvedValue([
        { id: 'store1' },
        { id: 'store2' },
      ]);

      const result = await service.getUserStoreIds('user1');

      expect(prisma.store.findMany).toHaveBeenCalledWith({
        where: { ownerId: 'user1', isActive: true },
        select: { id: true },
      });
      expect(cache.set).toHaveBeenCalledWith(
        'user:user1:storeIds',
        ['store1', 'store2'],
        300
      );
      expect(result).toEqual(['store1', 'store2']);
    });

    it('should invalidate cache correctly', async () => {
      await service.invalidateUserStoreCache('user1');
      expect(cache.del).toHaveBeenCalledWith('user:user1:storeIds');
    });

    it('should check user access to store', async () => {
      (cache.get as jest.fn).mockResolvedValue(['store1', 'store2']);

      const hasAccess = await service.hasUserAccessToStore('user1', 'store1');
      expect(hasAccess).toBe(true);

      const noAccess = await service.hasUserAccessToStore('user1', 'store3');
      expect(noAccess).toBe(false);
    });
  });

  describe('getAccessibleStoreIds', () => {
    it('should return [storeId] when storeId provided', async () => {
      const result = await service.getAccessibleStoreIds('user1', 'store1');
      expect(result).toEqual(['store1']);
    });

    it('should return user store IDs when userId provided', async () => {
      (cache.get as jest.fn).mockResolvedValue(['store1', 'store2']);
      const result = await service.getAccessibleStoreIds('user1');
      expect(result).toEqual(['store1', 'store2']);
    });

    it('should return empty array when no userId or storeId', async () => {
      const result = await service.getAccessibleStoreIds();
      expect(result).toEqual([]);
    });
  });
});
