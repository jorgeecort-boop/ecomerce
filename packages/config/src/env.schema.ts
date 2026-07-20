import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(10, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(10, 'JWT_SECRET must be at least 10 characters'),
  JWT_REFRESH_SECRET: z.string().min(10, 'JWT_REFRESH_SECRET must be at least 10 characters'),
  PORT: z.string().optional().default('3001'),
  NODE_ENV: z.string().optional().default('development'),
  WEB_URL: z.string().optional().default('http://localhost:3000'),
  API_URL: z.string().optional().default('http://localhost:3001'),
  MERCADOPAGO_ACCESS_TOKEN: z.string().optional(),
  MERCADOPAGO_PUBLIC_KEY: z.string().optional(),
  MERCADOPAGO_CLIENT_ID: z.string().optional(),
  MERCADOPAGO_CLIENT_SECRET: z.string().optional(),
  SHOPIFY_API_SECRET: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
});

export type ValidatedEnv = z.infer<typeof envSchema>;

interface LoggerLike {
  log(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export function validateEnv(logger?: LoggerLike): ValidatedEnv {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues.map(
      (i) => `  - ${i.path.join('.')}: ${i.message}`,
    );
    const msg = `Missing or invalid environment variables:\n${errors.join('\n')}`;
    logger?.error(msg);
    console.error(msg);
    process.exit(1);
  }

  const env = result.data;

  if (logger) {
    const warnings: string[] = [];

    if (!env.MERCADOPAGO_ACCESS_TOKEN) {
      warnings.push('MERCADOPAGO_ACCESS_TOKEN not set — MercadoPago payments disabled');
    }
    if (!env.MERCADOPAGO_CLIENT_SECRET) {
      warnings.push('MERCADOPAGO_CLIENT_SECRET not set — MP webhook verification disabled');
    }
    if (!env.SHOPIFY_API_SECRET) {
      warnings.push('SHOPIFY_API_SECRET not set — Shopify webhook verification disabled');
    }
    if (!env.SENTRY_DSN) {
      warnings.push('SENTRY_DSN not set — error monitoring disabled');
    }

    for (const w of warnings) {
      logger.warn(w);
    }

    logger.log(
      `Environment: ${env.NODE_ENV} | Web: ${env.WEB_URL} | API: ${env.API_URL}`,
    );
  }

  return env;
}
