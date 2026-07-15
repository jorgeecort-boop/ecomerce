import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../config/prisma.service';
import { MercadoPagoService } from '../payments/mercado-pago.service';

@Injectable()
export class OrderCleanupService {
  private readonly logger = new Logger(OrderCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mercadoPago: MercadoPagoService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async syncStalePendingPayments(): Promise<void> {
    this.logger.log('Syncing stale pending payments...');

    try {
      const staleOrders = await this.prisma.order.findMany({
        where: {
          paymentStatus: 'PENDING',
          stripePaymentId: { not: null },
          createdAt: {
            lte: new Date(Date.now() - 5 * 60 * 1000),
          },
        },
        select: { id: true, orderNumber: true, stripePaymentId: true },
        take: 20,
      });

      let synced = 0;

      for (const order of staleOrders) {
        try {
          const mpPaymentId = order.stripePaymentId!;
          const paymentInfo = await this.mercadoPago.getPayment(mpPaymentId);
          const { status, metadata } = paymentInfo;

          if (status === 'approved') {
            await this.prisma.$transaction([
              this.prisma.payment.updateMany({
                where: { stripePaymentIntentId: mpPaymentId },
                data: { status: 'PAID' },
              }),
              this.prisma.order.update({
                where: { id: order.id },
                data: { paymentStatus: 'PAID', paidAt: new Date(), status: 'CONFIRMED' },
              }),
            ]);
            this.logger.log(`Cron synced order ${order.orderNumber} to PAID`);
            synced++;
          } else if (status === 'rejected' || status === 'cancelled') {
            await this.prisma.$transaction([
              this.prisma.payment.updateMany({
                where: { stripePaymentIntentId: mpPaymentId },
                data: { status: 'FAILED', errorMessage: `Payment ${status}` },
              }),
              this.prisma.order.update({
                where: { id: order.id },
                data: { paymentStatus: 'FAILED' },
              }),
            ]);
            this.logger.log(`Cron marked order ${order.orderNumber} as FAILED`);
            synced++;
          }
        } catch (err: any) {
          this.logger.warn(`Failed to sync order ${order.orderNumber}: ${err.message}`);
        }
      }

      if (synced > 0) {
        this.logger.log(`Cron payment sync complete: ${synced} orders synced`);
      }
    } catch (err: any) {
      this.logger.error(`Cron payment sync failed: ${err.message}`);
    }
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async cleanupOrphanOrders(): Promise<void> {
    this.logger.log('Cleaning up orphan orders...');

    try {
      const cutoff = new Date(Date.now() - 60 * 60 * 1000);

      const orphanOrders = await this.prisma.order.findMany({
        where: {
          paymentStatus: 'PENDING',
          status: 'PENDING',
          stripePaymentId: null,
          createdAt: { lte: cutoff },
        },
        select: { id: true, orderNumber: true },
        take: 50,
      });

      if (orphanOrders.length === 0) return;

      const ids = orphanOrders.map((o) => o.id);

      await this.prisma.$transaction([
        this.prisma.orderItem.deleteMany({ where: { orderId: { in: ids } } }),
        this.prisma.order.updateMany({
          where: { id: { in: ids } },
          data: { status: 'CANCELLED', paymentStatus: 'FAILED', notes: 'Auto-cancelled: orphan order' },
        }),
      ]);

      const numbers = orphanOrders.map((o) => o.orderNumber).join(', ');
      this.logger.log(`Cleaned up ${orphanOrders.length} orphan orders: ${numbers}`);
    } catch (err: any) {
      this.logger.error(`Orphan cleanup failed: ${err.message}`);
    }
  }
}
