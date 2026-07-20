import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export const QUEUE_NAMES = {
  WEBHOOKS: 'webhooks',
  EMAILS: 'emails',
  FULFILLMENT: 'fulfillment',
  NOTIFICATIONS: 'notifications',
} as const;

type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.WEBHOOKS)
    private readonly webhooksQueue: Queue | null,
    @InjectQueue(QUEUE_NAMES.EMAILS)
    private readonly emailsQueue: Queue | null,
    @InjectQueue(QUEUE_NAMES.FULFILLMENT)
    private readonly fulfillmentQueue: Queue | null,
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS)
    private readonly notificationsQueue: Queue | null,
  ) {}

  async enqueue(
    queueName: QueueName,
    jobName: string,
    data: Record<string, unknown>,
    opts?: { delay?: number; attempts?: number },
  ): Promise<void> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      this.logger.warn(`Queue ${queueName} not available — job "${jobName}" skipped`);
      return;
    }

    try {
      await queue.add(jobName, data, {
        attempts: opts?.attempts ?? 3,
        backoff: { type: 'exponential', delay: 1000 },
        delay: opts?.delay,
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      });
      this.logger.debug(`Enqueued ${queueName}:${jobName}`);
    } catch (err: any) {
      this.logger.error(`Failed to enqueue ${queueName}:${jobName}: ${err.message}`);
    }
  }

  async enqueueWebhook(type: string, paymentId: string): Promise<void> {
    await this.enqueue(QUEUE_NAMES.WEBHOOKS, 'process-payment', { type, paymentId });
  }

  async enqueueEmail(
    template: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    await this.enqueue(QUEUE_NAMES.EMAILS, template, data);
  }

  async enqueueFulfillment(orderId: string): Promise<void> {
    await this.enqueue(QUEUE_NAMES.FULFILLMENT, 'fulfill', { orderId });
  }

  async enqueueNotification(message: string): Promise<void> {
    await this.enqueue(QUEUE_NAMES.NOTIFICATIONS, 'send-telegram', { message });
  }

  private getQueue(name: QueueName): Queue | null {
    switch (name) {
      case QUEUE_NAMES.WEBHOOKS:
        return this.webhooksQueue;
      case QUEUE_NAMES.EMAILS:
        return this.emailsQueue;
      case QUEUE_NAMES.FULFILLMENT:
        return this.fulfillmentQueue;
      case QUEUE_NAMES.NOTIFICATIONS:
        return this.notificationsQueue;
      default:
        return null;
    }
  }
}
