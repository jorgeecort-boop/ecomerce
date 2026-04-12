import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
  RawBodyRequest,
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
    const secret = this.config.get<string>('SHOPIFY_API_SECRET') || '';
    if (!secret) {
      this.logger.error('SHOPIFY_API_SECRET not configured — cannot verify webhooks');
      throw new UnauthorizedException('Webhook verification not configured');
    }

    const computedHmac = crypto
      .createHmac('sha256', secret)
      .update(bodyString, 'utf8')
      .digest('base64');

    // ── 4. Timing-safe comparison ─────────────────────────────────────────
    const isValid = this.timingSafeEqual(computedHmac, hmacHeader);

    if (!isValid) {
      this.logger.warn(
        `Webhook HMAC INVALID — topic: ${topic}, shop: ${shopDomain}, ` +
        `expected: ${computedHmac.substring(0, 8)}..., received: ${hmacHeader.substring(0, 8)}...`,
      );
      throw new UnauthorizedException('Invalid Shopify HMAC signature');
    }

    // ── 5. Optional: Verify shop domain matches our store ─────────────────
    const expectedDomain = this.config.get<string>('SHOPIFY_STORE_URL');
    if (expectedDomain && shopDomain && shopDomain !== expectedDomain) {
      this.logger.warn(
        `Webhook shop mismatch: expected ${expectedDomain}, got ${shopDomain}`,
      );
      throw new UnauthorizedException('Webhook from unexpected shop');
    }

    this.logger.log(`Webhook verified ✓ topic: ${topic}, shop: ${shopDomain}`);
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
