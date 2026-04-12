import { Injectable, Logger } from '@nestjs/common';

/**
 * EmailValidationService
 *
 * Uses two FREE public APIs (no auth, no API key needed):
 *  1. EVA  - https://eva.pingutil.com/  → validates deliverability
 *  2. Disify - https://www.disify.com/  → detects disposable / temp emails
 *
 * Both are called in parallel. We block only if EVA confirms invalid format
 * or Disify confirms it's a known disposable domain.
 */
@Injectable()
export class EmailValidationService {
  private readonly logger = new Logger(EmailValidationService.name);

  async validate(email: string): Promise<{ valid: boolean; reason?: string }> {
    try {
      // Call both APIs in parallel for speed
      const [evaResult, disifyResult] = await Promise.allSettled([
        this.checkEVA(email),
        this.checkDisify(email),
      ]);

      // --- EVA check ---
      if (evaResult.status === 'fulfilled') {
        const eva = evaResult.value;
        if (eva.status === 'invalid') {
          return { valid: false, reason: 'Email address is invalid or undeliverable' };
        }
      } else {
        // EVA failed (network error) → log and continue, don't block user
        this.logger.warn(`EVA check failed for ${email}: ${evaResult.reason}`);
      }

      // --- Disify check ---
      if (disifyResult.status === 'fulfilled') {
        const disify = disifyResult.value;
        if (disify.disposable === true || disify.format === false) {
          return { valid: false, reason: 'Disposable or temporary email addresses are not allowed' };
        }
      } else {
        this.logger.warn(`Disify check failed for ${email}: ${disifyResult.reason}`);
      }

      return { valid: true };
    } catch (err: unknown) {
      // Never block registration due to a validation API outage
      this.logger.error(`Email validation error: ${(err as Error).message ?? err}`);
      return { valid: true };
    }
  }

  // ------- EVA API -------
  // GET https://api.eva.pingutil.com/email?email=<email>
  // Response: { status: "valid" | "invalid" | "unknown", ... }
  private async checkEVA(email: string): Promise<{ status: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3s timeout

    try {
      const res = await fetch(
        `https://api.eva.pingutil.com/email?email=${encodeURIComponent(email)}`,
        { signal: controller.signal },
      );
      const data = await res.json();
      return { status: data?.data?.status ?? 'unknown' };
    } finally {
      clearTimeout(timeout);
    }
  }

  // ------- Disify API -------
  // GET https://www.disify.com/api/email/<email>
  // Response: { format: bool, disposable: bool, ... }
  private async checkDisify(email: string): Promise<{ format: boolean; disposable: boolean }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
      const res = await fetch(
        `https://www.disify.com/api/email/${encodeURIComponent(email)}`,
        { signal: controller.signal },
      );
      const data = await res.json();
      return {
        format: data?.format ?? true,
        disposable: data?.disposable ?? false,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
