import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('health')
@Controller('health')
@SkipThrottle()
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Liveness check (no DB)' })
  check() {
    // Keep this endpoint as light as possible: Render fires it repeatedly during
    // deploy and any delay or dependency failure can kill the instance.
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check (no DB for deploy stability)' })
  ready() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
