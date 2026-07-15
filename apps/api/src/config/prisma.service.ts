import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const dbUrl = process.env.DATABASE_URL || '';

    // Ensure sslmode=require so Supabase accepts the connection from Render.
    let url = dbUrl;
    if (url && !url.includes('sslmode=')) {
      url = url.includes('?') ? `${url}&sslmode=require` : `${url}?sslmode=require`;
    }

    super({
      datasourceUrl: url || undefined,
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'error', 'warn']
          : ['error'],
    });
  }

  async onModuleInit() {
    let retries = 5;
    while (retries > 0) {
      try {
        await this.$connect();
        this.logger.log('Database connected');
        return;
      } catch (error) {
        retries--;
        this.logger.warn(
          `Database connection failed. Retries left: ${retries}. Error: ${(error as Error).message}`,
        );
        if (retries > 0) {
          await new Promise((r) => setTimeout(r, 3000));
        }
      }
    }

    // OnRender free tier health checks are aggressive — if we throw here the
    // deploy is killed. Instead, let the app start and let Prisma lazily
    // reconnect on the first real query.
    this.logger.warn('Database unavailable after 5 retries — app starting without DB. Health checks will pass.');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
