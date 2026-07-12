import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

@Injectable()
export class MercadoPagoService {
  private readonly client: any;
  private readonly logger = new Logger(MercadoPagoService.name);
  private readonly accessToken: string;
  private readonly webhookUrl: string;

  constructor(private configService: ConfigService) {
    this.accessToken = this.configService.get<string>('MERCADOPAGO_ACCESS_TOKEN') || '';
    const apiUrl = this.configService.get<string>('API_URL') || 'http://localhost:3001';

    if (!this.accessToken) {
      this.logger.warn('MERCADOPAGO_ACCESS_TOKEN not configured. MercadoPago will not work.');
    }

    this.client = new MercadoPagoConfig({ accessToken: this.accessToken });

    this.webhookUrl = `${apiUrl}/api/payments/webhook`;
  }

  async createPreference(
    items: any[],
    payerEmail: string,
    total: number,
    currency: string,
    metadata?: Record<string, any>
  ) {
    const preference = new Preference(this.client);
    const storeSlug = metadata?.storeSlug || '';
    const webUrl = this.configService.get('WEB_URL') || 'http://localhost:3000';

    const isProduction = !webUrl.includes('localhost');

    const body: any = {
      items: items.map((item) => ({
        id: item.productId,
        title: item.title || 'Producto',
        unit_price: Number(item.price),
        quantity: item.quantity,
        currency_id: currency === 'COP' ? 'COP' : 'USD',
      })),
      payer: {
        email: payerEmail,
      },
      back_urls: {
        success: `${webUrl}/store/${storeSlug}/checkout/success`,
        failure: `${webUrl}/store/${storeSlug}/checkout/failure`,
        pending: `${webUrl}/store/${storeSlug}/checkout/pending`,
      },
      notification_url: this.webhookUrl,
      external_reference: metadata?.orderNumber || '',
      ...(isProduction && { auto_return: 'approved' }),
      metadata: {
        ...metadata,
        type: 'ecommerce_order',
      },
    };

    const result = await preference.create({ body });

    this.logger.log(`Preference created: ${result.id} - Total: ${total} ${currency}`);

    return {
      preferenceId: result.id,
      initPoint: result.init_point,
      sandboxInitPoint: result.sandbox_init_point,
    };
  }

  async getPayment(paymentId: string) {
    const payment = new Payment(this.client);
    return payment.get({ id: paymentId });
  }

  async getPreference(preferenceId: string) {
    const preference = new Preference(this.client);
    return preference.get({ preferenceId });
  }
}
