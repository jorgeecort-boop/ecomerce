import { Test, TestingModule } from '@nestjs/testing';
import { CurrencyService } from './currency.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('CurrencyService', () => {
  let service: CurrencyService;
  let cacheManager: any;

  beforeEach(async () => {
    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CurrencyService,
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
      ],
    }).compile();

    service = module.get<CurrencyService>(CurrencyService);
    
    // Mock global fetch
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ rates: { EUR: 0.85 }, base: 'USD' }),
      })
    ) as jest.Mock;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return cached rates if available', async () => {
    const cachedData = { rates: { EUR: 0.9 }, base: 'USD' };
    cacheManager.get.mockResolvedValue(cachedData);

    const result = await service.getRates();
    expect(result).toEqual(cachedData);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should fetch and cache rates if not cached', async () => {
    cacheManager.get.mockResolvedValue(null);

    const result = await service.getRates();
    expect(global.fetch).toHaveBeenCalledWith('https://api.frankfurter.app/latest?from=USD');
    expect(cacheManager.set).toHaveBeenCalledWith('currency_rates', { rates: { EUR: 0.85 }, base: 'USD' }, 43200000);
    expect(result.rates.EUR).toBe(0.85);
  });
});
