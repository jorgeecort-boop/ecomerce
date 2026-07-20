import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { SuccessInterceptor } from './common/interceptors/success.interceptor';
import { initSentry, captureException } from './common/sentry';
import { TelegramService } from './common/telegram.service';
import { validateEnv } from '@ecomerce/config';

async function bootstrap() {
  const envVars = validateEnv();
  const environment = process.env.NODE_ENV || 'development';

  initSentry(process.env.SENTRY_DSN, environment);

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);

  const port = process.env.PORT || 3001;

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // CORS (must be before any route handlers)
  const allowedOrigins = (envVars.WEB_URL || 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map((o) => o.trim());
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    credentials: true,
  });

  // Raw Express health check: bypasses all NestJS guards, interceptors and filters
  // so Render always gets a fast 200 during deploy, regardless of throttling or DB state.
  const healthResponse = (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  };
  app.use('/api/health', healthResponse);
  app.use('/api/health/live', healthResponse);

  // Raw body for webhook HMAC verification (must be before global prefix)
  app.use('/api/payments/webhook', require('express').raw({ type: 'application/json' }));
  app.use('/api/shopify/webhooks', require('express').raw({ type: 'application/json' }));

  // Global prefix for all NestJS routes
  app.setGlobalPrefix('api');

  // Global filters and interceptors
  const exceptionFilter = new HttpExceptionFilter();
  try {
    const telegramService = app.get(TelegramService);
    exceptionFilter.setSystemErrorNotifier((msg: string) => {
      telegramService.notifySystemError(msg).catch(() => {});
    });
  } catch {
    // TelegramService may not be available in test environment
  }
  app.useGlobalFilters(exceptionFilter);
  app.useGlobalInterceptors(new SuccessInterceptor());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Ecomerce API')
    .setDescription('Dropshipping automation platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port, '0.0.0.0');
  logger.log(`Application running on http://0.0.0.0:${port} [${environment}]`);
}

process.on('unhandledRejection', (reason: unknown) => {
  console.error('[UnhandledRejection]', reason);
  captureException(reason instanceof Error ? reason : new Error(String(reason)), {
    type: 'unhandledRejection',
  });
});

process.on('uncaughtException', (err: Error) => {
  console.error('[UncaughtException]', err.message, err.stack);
  captureException(err, { type: 'uncaughtException' });
});

bootstrap().catch((err) => {
  console.error('[FatalStartupError]', err);
  captureException(err, { type: 'fatalStartup' });
  process.exit(1);
});
