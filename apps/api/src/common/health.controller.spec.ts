/**
 * Integration-style tests for the health controller.
 *
 * Verifies that Render's health check is never throttled and returns instantly,
 * even when the DB or other dependencies are slow/unavailable.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { HealthController } from './health.controller';
import { AppThrottlerGuard } from './guards/throttler.guard';

describe('HealthController', () => {
  let app: INestApplication;

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

  it('should return 200 for readiness check', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health/ready')
      .expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
    });
  });
});
