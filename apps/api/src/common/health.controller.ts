import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../config/prisma.service';

@ApiTags('health')
@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  async check() {
    const checks: Record<string, string> = {};
    let status = 'ok';

    // Render's health check has a short timeout; don't let a slow DB query fail the deploy.
    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('db check timeout')), 1500),
        ),
      ]);
      checks.database = 'connected';
    } catch (err: any) {
      checks.database = err.message === 'db check timeout' ? 'slow' : 'disconnected';
      // Still report ok so Render does not kill the instance because of a transient slow DB query.
      status = err.message === 'db check timeout' ? 'ok' : 'error';
    }

    return { status, timestamp: new Date().toISOString(), checks };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check (includes DB)' })
  async ready() {
    await Promise.race([
      this.prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('db check timeout')), 1500),
      ),
    ]);
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
