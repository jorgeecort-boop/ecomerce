import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueService } from './queue.service';

export const QUEUE_NAMES = {
  WEBHOOKS: 'webhooks',
  EMAILS: 'emails',
  FULFILLMENT: 'fulfillment',
  NOTIFICATIONS: 'notifications',
} as const;

const redisUrl = process.env.REDIS_URL;

const bullModules = redisUrl
  ? [
      BullModule.forRoot({
        connection: { url: redisUrl },
      }),
      BullModule.registerQueue(
        { name: QUEUE_NAMES.WEBHOOKS },
        { name: QUEUE_NAMES.EMAILS },
        { name: QUEUE_NAMES.FULFILLMENT },
        { name: QUEUE_NAMES.NOTIFICATIONS },
      ),
    ]
  : [];

@Global()
@Module({
  imports: [...bullModules],
  providers: redisUrl ? [QueueService] : [],
  exports: [...bullModules, ...(redisUrl ? [QueueService] : [])],
})
export class QueueModule {}
