import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { TestSeedGuard } from './test-seed.guard';

describe('TestSeedGuard', () => {
  let guard: TestSeedGuard;
  let configValue: string | undefined;

  const buildContext = (headerToken?: string): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          headers: headerToken ? { 'x-e2e-seed-token': headerToken } : {},
        }),
      }),
    } as ExecutionContext);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestSeedGuard,
        {
          provide: ConfigService,
          useValue: { get: jest.fn(() => configValue) },
        },
      ],
    }).compile();

    guard = module.get<TestSeedGuard>(TestSeedGuard);
  });

  it('throws NotFoundException when E2E_SEED_TOKEN env is not set', () => {
    configValue = undefined;
    expect(() => guard.canActivate(buildContext('anything'))).toThrow(NotFoundException);
  });

  it('throws NotFoundException when E2E_SEED_TOKEN is empty string', () => {
    configValue = '';
    expect(() => guard.canActivate(buildContext('anything'))).toThrow(NotFoundException);
  });

  it('throws UnauthorizedException when header is missing', () => {
    configValue = 'secret-token';
    expect(() => guard.canActivate(buildContext(undefined))).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when header does not match', () => {
    configValue = 'secret-token';
    expect(() => guard.canActivate(buildContext('wrong-token'))).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when header has different length', () => {
    configValue = 'secret-token';
    expect(() => guard.canActivate(buildContext('shorter'))).toThrow(UnauthorizedException);
  });

  it('returns true when header matches the configured token exactly', () => {
    configValue = 'secret-token';
    expect(guard.canActivate(buildContext('secret-token'))).toBe(true);
  });
});
