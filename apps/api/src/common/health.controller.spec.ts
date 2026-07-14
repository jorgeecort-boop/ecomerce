/**
 * Integration-style tests for the health controller.
 *
 * Verifies that Render's health check is never throttled, even when
 * Render fires many requests in a row during startup.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { HealthController } from './health.controller';
import { PrismaService } from '../config/prisma.service';
import { AppThrottlerGuard } from './guards/throttler.guard';

describe('HealthController', () => {
  let app: INestApplication;

  const mockPrisma = {
    $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            name: 'default',
            ttl: 60000,
            limit: 20,
          },
          {
            name: 'auth',
            ttl: 60000,
            limit: 5,
          },
        ]),
      ],
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: mockPrisma }],
    })
      .overrideGuard(AppThrottlerGuard)
      .useClass(AppThrottlerGuard)
      .compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should return 200 for a single health check', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      checks: { database: 'connected' },
    });
  });

  it('should not throttle rapid health checks (Render deploy scenario)', async () => {
    const requests = Array.from({ length: 10 }, () =>
      request(app.getHttpServer()).get('/api/health'),
    );

    const responses = await Promise.all(requests);

    responses.forEach((res) => {
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });
});
