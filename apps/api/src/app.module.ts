import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppThrottlerGuard } from './common/guards/throttler.guard';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { StoresModule } from './modules/stores/stores.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { TrendingModule } from './modules/trending/trending.module';
import { CartModule } from './modules/cart/cart.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DashboardUnifiedModule } from './modules/dashboard-unified/dashboard-unified.module';
import { ShopifyModule } from './modules/shopify/shopify.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PrismaModule } from './config/prisma.module';
import { HealthController } from './common/health.controller';
import { TelegramModule } from './common/telegram.module';
import { TelegramBotModule } from './modules/telegram-bot/telegram-bot.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { TestSeedModule } from './modules/test-seed/test-seed.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { CurrencyModule } from './modules/currency/currency.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { QueueModule } from './common/queue/queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local', '../../.env'],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 20,
      },
      {
        name: 'auth',
        ttl: 60000,
        limit: 5,
      },
    ]),
    CacheModule.register({
      isGlobal: true,
      ttl: 60 * 1000, // 60 seconds default
      max: 100,       // max 100 items in memory
    }),
    ScheduleModule.forRoot(),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : {
                target: 'pino-pretty',
                options: { colorize: true, singleLine: true },
              },
        autoLogging: false,
        serializers: {
          req: (req) => ({
            method: req.method,
            url: req.url,
          }),
          res: (res) => ({
            statusCode: res.statusCode,
          }),
        },
      },
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    StoresModule,
    ProductsModule,
    OrdersModule,
    SuppliersModule,
    TrendingModule,
    CartModule,
    DashboardModule,
    DashboardUnifiedModule,
    ShopifyModule,
    PaymentsModule,
    TelegramModule,
    TelegramBotModule,
    CouponsModule,
    TestSeedModule,
    ReviewsModule,
    CurrencyModule,
    WishlistModule,
    WebhooksModule,
    QueueModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
  ],
})
export class AppModule {}
