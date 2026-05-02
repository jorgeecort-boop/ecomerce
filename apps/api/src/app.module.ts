import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
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
  ],
  controllers: [HealthController],
})
export class AppModule {}
