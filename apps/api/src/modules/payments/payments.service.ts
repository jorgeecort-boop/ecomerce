import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { MercadoPagoService } from './mercado-pago.service';
import { TelegramService } from '../../common/telegram.service';
import { EmailService } from '../../common/email.service';
import { AutoFulfillmentService } from '../shopify/auto-fulfillment.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private mercadoPagoService: MercadoPagoService,
    private telegram: TelegramService,
    private email: EmailService,
    private autoFulfillment: AutoFulfillmentService,
  ) {}

  async handlePaymentNotification(data: any) {
    const { type, data: notificationData } = data;

    if (type === 'payment') {
      const paymentId = String(notificationData.id);
      this.logger.log(`Payment notification: id=${paymentId}`);

      const paymentInfo = await this.mercadoPagoService.getPayment(paymentId);
      return this.processPaymentStatus(paymentId, paymentInfo);
    }

    return { received: true };
  }

  async checkAndSyncOrderStatus(orderNumber: string): Promise<{
    orderNumber: string;
    status: string;
    paymentStatus: string;
    synced: boolean;
  }> {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
    });

    if (!order) {
      throw new BadRequestException(`Order ${orderNumber} not found`);
    }

    if (order.paymentStatus === 'PAID') {
      return {
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        synced: false,
      };
    }

    const mpPaymentId = order.stripePaymentId;
    if (!mpPaymentId) {
      return {
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        synced: false,
      };
    }

    try {
      const paymentInfo = await this.mercadoPagoService.getPayment(mpPaymentId);
      await this.processPaymentStatus(mpPaymentId, paymentInfo);

      const updated = await this.prisma.order.findUnique({
        where: { id: order.id },
        select: { status: true, paymentStatus: true },
      });

      return {
        orderNumber: order.orderNumber,
        status: updated?.status || order.status,
        paymentStatus: updated?.paymentStatus || order.paymentStatus,
        synced: true,
      };
    } catch (err: any) {
      this.logger.error(`Failed to sync order ${orderNumber}: ${err.message}`);
      return {
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        synced: false,
      };
    }
  }

  async processPaymentStatus(paymentId: string, paymentInfo: any): Promise<{ received: boolean }> {
    const { status, metadata, payment_method_id } = paymentInfo;

    this.logger.log(`Payment ${paymentId} status=${status}`);

    if (!metadata || !metadata.orderId) {
      this.logger.warn(`Payment ${paymentId} has no orderId in metadata`);
      return { received: true };
    }

    const orderId = metadata.orderId;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) {
      this.logger.warn(`Order ${orderId} not found for payment ${paymentId}`);
      return { received: true };
    }

    let paymentRecord = await this.prisma.payment.findFirst({
      where: { stripePaymentIntentId: paymentId },
    });

    if (!paymentRecord) {
      paymentRecord = await this.prisma.payment.create({
        data: {
          orderId: order.id,
          stripePaymentIntentId: paymentId,
          amount: order.total,
          currency: order.currency,
          status: 'PENDING',
          method: payment_method_id || 'mercadopago',
        },
      });
    }

    if (paymentRecord.status === 'PAID') {
      this.logger.log(`Payment ${paymentId} already processed as PAID, skipping`);
      return { received: true };
    }

    if (status === 'approved') {
      await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { id: paymentRecord.id },
          data: { status: 'PAID', method: payment_method_id || 'mercadopago' },
        }),
        this.prisma.order.update({
          where: { id: order.id },
          data: { paymentStatus: 'PAID', paidAt: new Date(), status: 'CONFIRMED' },
        }),
      ]);
      this.logger.log(`Order ${order.id} marked as PAID`);
      await this.telegram.notifyPaymentReceived(
        order.orderNumber,
        Number(order.total),
        payment_method_id || 'mercadopago'
      );

      this.autoFulfillment.fulfillStoreOrder(order.id).catch((err) => {
        this.logger.error(`Auto-fulfillment failed for order ${order.id}: ${err.message}`);
      });

      if (order.customerEmail) {
        const ship = (order.shippingAddress as Record<string, unknown> | null) ?? null;
        const customerName = ship?.['name'] ? String(ship['name']) : 'Cliente';
        await this.email.sendOrderConfirmation({
          to: order.customerEmail,
          customerName,
          orderNumber: order.orderNumber,
          items: order.items.map((it) => ({
            title: it.title || 'Producto',
            quantity: it.quantity,
            price: Number(it.price),
          })),
          total: Number(order.total),
          currency: order.currency,
          shippingAddress: ship
            ? {
                address: ship['address'] ? String(ship['address']) : undefined,
                city: ship['city'] ? String(ship['city']) : undefined,
                country: ship['country'] ? String(ship['country']) : undefined,
              }
            : undefined,
        });
      }
    } else if (status === 'rejected' || status === 'cancelled') {
      if ((paymentRecord.status as string) !== 'PAID') {
        await this.prisma.$transaction([
          this.prisma.payment.update({
            where: { id: paymentRecord.id },
            data: { status: 'FAILED', errorMessage: `Payment ${status}` },
          }),
          this.prisma.order.update({
            where: { id: order.id },
            data: { paymentStatus: 'FAILED' },
          }),
        ]);
      }
      this.logger.warn(`Payment ${paymentId} ${status}`);
      await this.telegram.sendMessage(
        `<b>❌ Pago Rechazado</b>\n\n` +
          `Orden: <code>${order.orderNumber}</code>\n` +
          `Monto: $${Number(order.total).toFixed(2)}\n` +
          `Estado: ${status}`
      );
    } else if (status === 'pending' || status === 'in_process') {
      if ((paymentRecord.status as string) !== 'PAID') {
        await this.prisma.payment.update({
          where: { id: paymentRecord.id },
          data: { status: 'PENDING' },
        });
      }
    }

    return { received: true };
  }
}
