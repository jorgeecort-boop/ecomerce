import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class TestSeedGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('E2E_SEED_TOKEN');

    if (!expected) {
      throw new NotFoundException();
    }

    const request = context.switchToHttp().getRequest();
    const provided = request.headers['x-e2e-seed-token'] as string | undefined;

    if (!provided || !this.timingSafeEqual(provided, expected)) {
      throw new UnauthorizedException('Invalid test-seed token');
    }

    return true;
  }

  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  }
}
