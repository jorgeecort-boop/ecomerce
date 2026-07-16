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

    const isCOP = currency === 'COP';
    const body: any = {
      items: items.map((item) => ({
        id: item.productId,
        title: item.title || 'Producto',
        unit_price: isCOP ? Math.round(Number(item.price)) : Number(item.price),
        quantity: item.quantity,
        currency_id: isCOP ? 'COP' : 'USD',
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

  async createPayment(paymentData: {
    transaction_amount: number;
    token: string;
    description: string;
    installments: number;
    payment_method_id: string;
    issuer_id?: string;
    payer: {
      email: string;
      identification: { type: string; number: string };
    };
    metadata?: Record<string, any>;
  }) {
    const payment = new Payment(this.client);
    const isCOP = paymentData.transaction_amount > 1000;

    const body: any = {
      transaction_amount: isCOP
        ? Math.round(paymentData.transaction_amount)
        : paymentData.transaction_amount,
      token: paymentData.token,
      description: paymentData.description,
      installments: paymentData.installments,
      payment_method_id: paymentData.payment_method_id,
      payer: {
        email: paymentData.payer.email,
        identification: {
          type: paymentData.payer.identification.type,
          number: paymentData.payer.identification.number,
        },
      },
      ...(paymentData.issuer_id && { issuer_id: paymentData.issuer_id }),
      metadata: {
        ...paymentData.metadata,
        type: 'ecommerce_order',
      },
    };

    const result = await payment.create({ body });

    this.logger.log(
      `Payment ${result.id}: ${result.status} (${result.status_detail})`,
    );

    return result;
  }
}
