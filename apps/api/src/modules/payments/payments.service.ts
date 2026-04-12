import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { MercadoPagoService } from './mercado-pago.service';
import { TelegramService } from '../../common/telegram.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private mercadoPagoService: MercadoPagoService,
    private telegram: TelegramService
  ) {}

  async handlePaymentNotification(data: any) {
    const { type, data: notificationData } = data;

    if (type === 'payment') {
      const paymentId = String(notificationData.id);
      this.logger.log(`Payment notification received: ${paymentId}`);

      const paymentInfo = await this.mercadoPagoService.getPayment(paymentId);
      const { status, metadata, payment_method_id } = paymentInfo;

      this.logger.log(`Payment ${paymentId} status: ${status}`);

      if (!metadata || !metadata.orderId) {
        this.logger.warn(`Payment ${paymentId} has no orderId in metadata`);
        return { received: true };
      }

      const orderId = metadata.orderId;

      const order = await this.prisma.order.findUnique({ where: { id: orderId } });
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
        this.logger.log(`Order ${orderId} marked as PAID`);
        await this.telegram.notifyPaymentReceived(
          order.orderNumber,
          Number(order.total),
          payment_method_id || 'mercadopago'
        );
      } else if (status === 'rejected' || status === 'cancelled') {
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
        this.logger.warn(`Payment ${paymentId} ${status}`);
        await this.telegram.sendMessage(
          `<b>❌ Pago Rechazado</b>\n\n` +
            `Orden: <code>${order.orderNumber}</code>\n` +
            `Monto: $${Number(order.total).toFixed(2)}\n` +
            `Estado: ${status}`
        );
      } else if (status === 'pending' || status === 'in_process') {
        await this.prisma.payment.update({
          where: { id: paymentRecord.id },
          data: { status: 'PENDING' },
        });
      }
    }

    return { received: true };
  }
}
