import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly botToken: string;
  private readonly chatId: string;
  private readonly enabled: boolean;

  constructor(private config: ConfigService) {
    this.botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN', '');
    this.chatId = this.config.get<string>('TELEGRAM_CHAT_ID', '');
    this.enabled = !!(this.botToken && this.chatId);

    if (this.enabled) {
      this.logger.log('Telegram notifications enabled');
    } else {
      this.logger.warn('Telegram notifications disabled (missing BOT_TOKEN or CHAT_ID)');
    }
  }

  async sendMessage(text: string, parseMode: 'HTML' | 'Markdown' = 'HTML'): Promise<boolean> {
    if (!this.enabled) {
      this.logger.debug('Telegram disabled, skipping message');
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text,
          parse_mode: parseMode,
          disable_web_page_preview: true,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Telegram API error: ${error}`);
        return false;
      }

      this.logger.log('Telegram message sent');
      return true;
    } catch (err) {
      this.logger.error(`Failed to send Telegram message: ${(err as Error).message}`);
      return false;
    }
  }

  async notifyNewOrder(
    orderNumber: string,
    total: number,
    customerEmail: string
  ): Promise<boolean> {
    const text =
      `<b>🛒 Nueva Orden</b>\n\n` +
      `Orden: <code>${orderNumber}</code>\n` +
      `Total: $${total.toFixed(2)}\n` +
      `Cliente: ${customerEmail}\n` +
      `Fecha: ${new Date().toLocaleString('es-CO')}`;

    return this.sendMessage(text);
  }

  async notifyPaymentReceived(
    orderNumber: string,
    amount: number,
    method: string
  ): Promise<boolean> {
    const text =
      `<b>💰 Pago Recibido</b>\n\n` +
      `Orden: <code>${orderNumber}</code>\n` +
      `Monto: $${amount.toFixed(2)}\n` +
      `Método: ${method}\n` +
      `Fecha: ${new Date().toLocaleString('es-CO')}`;

    return this.sendMessage(text);
  }

  async notifyLowStock(productTitle: string, inventory: number): Promise<boolean> {
    const text =
      `<b>⚠️ Stock Bajo</b>\n\n` +
      `Producto: ${productTitle}\n` +
      `Inventario restante: ${inventory}\n` +
      `Fecha: ${new Date().toLocaleString('es-CO')}`;

    return this.sendMessage(text);
  }

  async notifySystemError(error: string): Promise<boolean> {
    const text =
      `<b>🚨 Error del Sistema</b>\n\n` +
      `<code>${error.slice(0, 1000)}</code>\n\n` +
      `Fecha: ${new Date().toLocaleString('es-CO')}`;

    return this.sendMessage(text);
  }

  async notifyDeploySuccess(): Promise<boolean> {
    const text =
      `<b>✅ Deploy Exitoso</b>\n\n` +
      `La aplicación ha sido desplegada correctamente.\n` +
      `Fecha: ${new Date().toLocaleString('es-CO')}`;

    return this.sendMessage(text);
  }
}
