import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Custom throttler guard that always bypasses rate limiting for the
 * Render/health-check endpoint. Render fires many rapid health checks during
 * deploy, and a named throttle config (or a transient burst) can otherwise
 * return 429 and kill the deploy.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const url = req?.url || '';

    if (url === '/api/health' || url.startsWith('/api/health/')) {
      return true;
    }

    return super.canActivate(context);
  }
}
