import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const method = request.method as string;

    if (SAFE_METHODS.includes(method)) return true;

    const origin = (request.headers['origin'] as string) || '';
    const referer = (request.headers['referer'] as string) || '';

    const allowedOrigins = (process.env.WEB_URL || 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);

    const isAllowedOrigin = allowedOrigins.some(
      (allowed) => origin && origin.startsWith(allowed),
    );
    const isAllowedReferer = allowedOrigins.some(
      (allowed) => referer && referer.startsWith(allowed),
    );

    if (isAllowedOrigin || isAllowedReferer) return true;

    throw new ForbiddenException('CSRF validation failed: invalid origin');
  }
}
