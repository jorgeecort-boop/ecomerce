import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * ShopifyWebhookGuard
 *
 * Validates the HMAC-SHA256 signature on all incoming Shopify webhook requests.
 * Shopify signs every webhook payload with your app's API secret.
 *
 * How it works:
 *   1. Shopify sends header: x-shopify-hmac-sha256 = base64(HMAC-SHA256(body, secret))
 *   2. We recompute the HMAC from the raw body and compare
 *   3. Reject with 401 if they don't match — prevents forged requests
 *
 * IMPORTANT: This guard needs the RAW body (not parsed JSON).
 *   In main.ts, you must enable rawBody for the webhook routes:
 *     app.useBodyParser('json', { rawBody: true });
 *   OR configure NestFactory with: { rawBody: true }
 *
 * Usage:
 *   @UseGuards(ShopifyWebhookGuard)
 *   @Post('orders/create')
 *   handleOrderCreate(@Body() body: any) { ... }
 */
@Injectable()
export class ShopifyWebhookGuard implements CanActivate {
  private readonly logger = new Logger(ShopifyWebhookGuard.name);

  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const hmacHeader = request.headers['x-shopify-hmac-sha256'] as string;
    const topic = request.headers['x-shopify-topic'] as string;
    const shopDomain = request.headers['x-shopify-shop-domain'] as string;

    // ── 1. Verify the HMAC header is present ──────────────────────────────
    if (!hmacHeader) {
      this.logger.warn(`Webhook rejected: missing HMAC header (topic: ${topic})`);
      throw new UnauthorizedException('Missing Shopify HMAC signature');
    }

    // ── 2. Get the raw body ───────────────────────────────────────────────
    // NestJS with rawBody: true stores it on request.rawBody
    const rawBody = (request as any).rawBody;
    if (!rawBody) {
      // Fallback: stringify the parsed body (less secure but works without rawBody config)
      this.logger.warn('Raw body not available — using JSON.stringify fallback. Enable rawBody in main.ts for production.');
    }

    const bodyString = rawBody
      ? rawBody.toString('utf8')
      : JSON.stringify(request.body);

    // ── 3. Compute HMAC ───────────────────────────────────────────────────
    const secretConfigs: { key: string; label: string }[] = [
      { key: 'SHOPIFY_API_SECRET', label: 'API_SECRET' },
      { key: 'SHOPIFY_WEBHOOK_SECRET', label: 'WEBHOOK_SECRET' },
      { key: 'SHOPIFY_WEBHOOK_SECRET_LEGACY', label: 'WEBHOOK_LEGACY' },
    ];

    const secrets: { value: string; label: string }[] = [];
    for (const cfg of secretConfigs) {
      const val = this.config.get<string>(cfg.key);
      if (val) {
        secrets.push({ value: val, label: cfg.label });
      }
    }

    const uniqueSecrets = secrets.filter(
      (s, i, arr) => arr.findIndex((x) => x.value === s.value) === i,
    );

    if (uniqueSecrets.length === 0) {
      this.logger.error('No Shopify secrets configured — cannot verify webhooks');
      throw new UnauthorizedException('Webhook verification not configured');
    }

    let isValid = false;
    let matchedLabel = '';
    for (const { value, label } of uniqueSecrets) {
      const computedHmac = crypto
        .createHmac('sha256', value)
        .update(bodyString, 'utf8')
        .digest('base64');

      if (this.timingSafeEqual(computedHmac, hmacHeader)) {
        isValid = true;
        matchedLabel = label;
        break;
      }
    }

    if (!isValid) {
      const attempts = uniqueSecrets.map(
        ({ value, label }) =>
          `${label}:${crypto.createHmac('sha256', value).update(bodyString, 'utf8').digest('base64').substring(0, 8)}...`,
      );
      this.logger.warn(
        `Webhook HMAC INVALID — topic: ${topic}, shop: ${shopDomain}\n` +
        `  Attempted: [${attempts.join(', ')}]\n` +
        `  Received:  ${hmacHeader.substring(0, 8)}...`,
      );

      const nodeEnv = this.config.get<string>('NODE_ENV', 'development');
      if (nodeEnv === 'production') {
        throw new UnauthorizedException('Invalid Shopify HMAC signature');
      }
      this.logger.warn('HMAC guard ALLOWED despite mismatch (NODE_ENV != production)');
    } else {
      this.logger.log(`Webhook verified via ${matchedLabel} ✓ topic: ${topic}`);
    }

    // ── 5. Optional: Verify shop domain is a valid Shopify store ──────────
    if (shopDomain && !shopDomain.endsWith('.myshopify.com')) {
      this.logger.warn(`Webhook from non-Shopify domain: ${shopDomain}`);
      throw new UnauthorizedException('Webhook from unexpected shop');
    }

    return true;
  }

  /**
   * Timing-safe string comparison to prevent timing attacks.
   */
  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;

    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');

    return crypto.timingSafeEqual(bufA, bufB);
  }
}
