import { Controller, Get, Headers } from '@nestjs/common';
import { CurrencyService } from './currency.service';

@Controller('currency')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Get('detect')
  async detectCurrency(@Headers('x-forwarded-for') forwardedFor: string,
                      @Headers('x-real-ip') realIp: string,
                      @Headers('cf-connecting-ip') cfIp: string) {
    // Priorizar headers comunes en reverse proxies/edge
    const ip = forwardedFor?.split(',')[0].trim() ||
               realIp ||
               cfIp ||
               '127.0.0.1'; // fallback

    return this.currencyService.detectCurrencyByIp(ip);
  }

  @Get('rates')
  async getRates() {
    return this.currencyService.getRates();
  }
}