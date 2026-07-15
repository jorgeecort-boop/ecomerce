import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string;
  private readonly fromAddress: string;
  private readonly enabled: boolean;

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('RESEND_API_KEY', '');
    this.fromAddress = this.config.get<string>('EMAIL_FROM', 'Ecomerce <onboarding@resend.dev>');
    this.enabled = !!this.apiKey;

    if (this.enabled) {
      this.logger.log(`Email enabled (from: ${this.fromAddress})`);
    } else {
      this.logger.warn('Email disabled (RESEND_API_KEY not set)');
    }
  }

  async send({ to, subject, html }: SendEmailParams): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: this.fromAddress, to, subject, html }),
      });

      if (!res.ok) {
        const err = await res.text();
        this.logger.error(`Resend send failed (${res.status}): ${err.slice(0, 300)}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.error(`Email send error: ${(err as Error).message}`);
      return false;
    }
  }

  async sendOrderConfirmation(params: {
    to: string;
    customerName: string;
    orderNumber: string;
    items: Array<{ title: string; quantity: number; price: number }>;
    total: number;
    currency: string;
    shippingAddress?: { address?: string; city?: string; country?: string };
  }): Promise<boolean> {
    const fmt = (n: number) =>
      params.currency === 'COP'
        ? `$${Math.round(n).toLocaleString('es-CO')} COP`
        : `$${n.toFixed(2)} ${params.currency}`;

    const itemsHtml = params.items
      .map(
        (i) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #eee">${i.title}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${fmt(i.price * i.quantity)}</td>
        </tr>`
      )
      .join('');

    const shipping = params.shippingAddress
      ? `<p style="color:#555;font-size:14px;margin-top:24px">
          <strong>Dirección de envío:</strong><br>
          ${params.shippingAddress.address ?? ''}<br>
          ${params.shippingAddress.city ?? ''} – ${params.shippingAddress.country ?? ''}
        </p>`
      : '';

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#222">
        <div style="text-align:center;padding:24px 0;border-bottom:2px solid #2563eb">
          <h1 style="color:#2563eb;margin:0">¡Pedido confirmado!</h1>
        </div>
        <p style="font-size:16px">Hola ${params.customerName},</p>
        <p>Recibimos tu pago correctamente. Tu pedido <strong>${params.orderNumber}</strong> está en proceso.</p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px">
          <thead>
            <tr style="background:#f3f4f6">
              <th style="padding:8px;text-align:left">Producto</th>
              <th style="padding:8px;text-align:center">Cant.</th>
              <th style="padding:8px;text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
          <tfoot>
            <tr><td colspan="2" style="padding:12px 8px;text-align:right;font-weight:bold">Total pagado:</td>
            <td style="padding:12px 8px;text-align:right;font-weight:bold;font-size:16px;color:#2563eb">${fmt(params.total)}</td></tr>
          </tfoot>
        </table>
        ${shipping}
        <p style="color:#666;font-size:13px;margin-top:32px;text-align:center">
          Gracias por tu compra. Si tienes preguntas, responde a este email.
        </p>
      </div>`;

    return this.send({
      to: params.to,
      subject: `Pedido confirmado #${params.orderNumber}`,
      html,
    });
  }

  async sendShippingConfirmation(params: {
    to: string;
    customerName: string;
    orderNumber: string;
    trackingNumber: string;
    trackingUrl?: string;
  }): Promise<boolean> {
    const trackingLink = params.trackingUrl
      ? `<p style="text-align:center;margin-top:20px">
          <a href="${params.trackingUrl}" style="display:inline-block;padding:12px 32px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
            Rastrear pedido
          </a>
        </p>`
      : '';

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#222">
        <div style="text-align:center;padding:24px 0;border-bottom:2px solid #059669">
          <h1 style="color:#059669;margin:0">¡Tu pedido va en camino!</h1>
        </div>
        <p style="font-size:16px">Hola ${params.customerName},</p>
        <p>Tu pedido <strong>${params.orderNumber}</strong> ha sido enviado.</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:0;font-size:15px"><strong>Número de guía:</strong> ${params.trackingNumber}</p>
        </div>
        ${trackingLink}
        <p style="color:#666;font-size:13px;margin-top:32px;text-align:center">
          El tiempo de entrega estimado es de 3-5 días hábiles.<br>
          Puedes rastrear tu pedido en cualquier momento.
        </p>
      </div>`;

    return this.send({
      to: params.to,
      subject: `Tu pedido #${params.orderNumber} va en camino`,
      html,
    });
  }
}
