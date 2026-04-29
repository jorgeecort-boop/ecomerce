import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);
  
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async getRates(): Promise<any> {
    const CACHE_KEY = 'currency_rates';
    const cachedRates = await this.cacheManager.get(CACHE_KEY);
    
    if (cachedRates) {
      return cachedRates;
    }

    try {
      const response = await fetch('https://api.frankfurter.app/latest?from=USD');
      if (response.ok) {
        const data = await response.json();
        await this.cacheManager.set(CACHE_KEY, data, 43200000);
        return data;
      }
    } catch (error) {
      this.logger.error('Failed to fetch currency rates', error);
    }
    
    return {
      amount: 1,
      base: 'USD',
      date: new Date().toISOString().split('T')[0],
      rates: {
        EUR: 0.92,
        GBP: 0.79,
        JPY: 150.0,
        COP: 3900.0,
        MXN: 17.0,
        BRL: 5.2,
      }
    };
  }

  /**
   * Detect visitor's currency based on IP address with caching
   * Results cached for 24 hours per IP to avoid repeated lookups
   */
  async detectCurrencyByIp(ip: string): Promise<{ suggestedCurrency: string; rates: any; ip: string }> {
    const CACHE_KEY = `currency_ip:${ip}`;
    const cached = await this.cacheManager.get<{ suggestedCurrency: string; rates: any; ip: string }>(CACHE_KEY);
    
    if (cached) {
      return cached;
    }

    const ratesData = await this.getRates();
    const cleanIp = ip.split(':')[0].trim();
    
    let suggestedCurrency = 'USD';
    
    // Colombian IP ranges
    if (cleanIp.startsWith('190.') || cleanIp.startsWith('186.') || 
        cleanIp.startsWith('170.') || cleanIp.startsWith('181.') ||
        cleanIp.startsWith('201.') || cleanIp.startsWith('200.')) {
      suggestedCurrency = 'COP';
    }
    // European ranges
    else if (cleanIp.match(/^(8[0-5]|8[6-9]|9[0-5]|212|213|217|6[2-5]|8[6-9]|7[7-9]|212|213|217)/)) {
      suggestedCurrency = 'EUR';
    }
    // UK ranges
    else if (cleanIp.match(/^80\.|^81\.|^2\./)) {
      suggestedCurrency = 'GBP';
    }
    // Japanese ranges
    else if (cleanIp.match(/^(133|150|153|203|210|211|218|219|222|223)\./)) {
      suggestedCurrency = 'JPY';
    }
    // Australian ranges
    else if (cleanIp.match(/^(1\.|10[1-9]|11[0-9]|12[0-9]|13[0-9]|14[0-9]|15[0-9]|16[0-9]|17[0-9]|18[0-9]|19[0-9]|20[0-9]|21[0-9]|22[0-9]|23[0-9]|24[0-9]|25[0-5])\./)) {
      suggestedCurrency = 'AUD';
    }
    // Brazilian Real
    else if (cleanIp.match(/^(17[79]|18[16-9]|19[0-2]|20[0146-9]|21[236-9]|22[0-9]|23[0-9]|24[0-9]|25[0-5])\./)) {
      suggestedCurrency = 'BRL';
    }
    // Mexican Peso
    else if (cleanIp.match(/^(18[79]|19[0-27-9]|20[0146-9]|21[236-9]|22[0-9]|23[0-9]|24[0-9]|25[0-5])\./)) {
      suggestedCurrency = 'MXN';
    }

    const result = {
      suggestedCurrency,
      rates: ratesData.rates,
      ip: cleanIp,
    };

    await this.cacheManager.set(CACHE_KEY, result, 86400000);
    return result;
  }
}
