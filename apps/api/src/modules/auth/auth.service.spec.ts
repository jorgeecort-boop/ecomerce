import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { EmailValidationService } from './email-validation.service';
import { EmailService } from '../../common/email.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: Partial<UsersService>;
  let jwtService: Partial<JwtService>;
  let configService: Partial<ConfigService>;
  let emailValidation: Partial<EmailValidationService>;

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
      verify: jest.fn(),
    };

    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        const vals: Record<string, string> = {
          JWT_SECRET: 'test-secret',
          JWT_REFRESH_SECRET: 'test-refresh-secret',
          JWT_EXPIRES_IN: '15m',
          JWT_REFRESH_EXPIRES_IN: '7d',
        };
        return vals[key];
      }),
    };

    emailValidation = {
      validate: jest.fn().mockResolvedValue({ valid: true }),
    };

    const emailService = {
      sendEmail: jest.fn().mockResolvedValue({ id: 'email-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: EmailValidationService, useValue: emailValidation },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should throw ConflictException if email already exists', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue({ id: '1', email: 'test@test.com' });

      await expect(
        authService.register({ email: 'test@test.com', password: 'password123' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create user and return tokens on successful registration', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);
      (usersService.create as jest.Mock).mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        password: 'hashedpassword',
      });

      const result = await authService.register({ email: 'test@test.com', password: 'password123' });

      expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
      expect(result).toHaveProperty('refreshToken', 'mock-jwt-token');
      expect(result.user).toHaveProperty('id', '1');
      expect(result.user).toHaveProperty('email', 'test@test.com');
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@test.com',
          password: expect.any(String),
        }),
      );
    });

    it('should reject registration with invalid email', async () => {
      (emailValidation.validate as jest.Mock).mockResolvedValue({
        valid: false,
        reason: 'Disposable email',
      });

      await expect(
        authService.register({ email: 'test@tempmail.com', password: 'password123' }),
      ).rejects.toThrow('Disposable email');
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.login({ email: 'test@test.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 10);
      (usersService.findByEmail as jest.Mock).mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        password: hashedPassword,
      });

      await expect(
        authService.login({ email: 'test@test.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return tokens on successful login', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      (usersService.findByEmail as jest.Mock).mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        password: hashedPassword,
        isActive: true,
      });

      const result = await authService.login({ email: 'test@test.com', password: 'password123' });

      expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
      expect(result).toHaveProperty('refreshToken', 'mock-jwt-token');
      expect(result.user).toHaveProperty('id', '1');
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens for valid refresh token', async () => {
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: '1', email: 'test@test.com' });
      (usersService.findById as jest.Mock).mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        isActive: true,
      });

      const result = await authService.refreshToken('valid-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(jwtService.verify).toHaveBeenCalledWith('valid-refresh-token', {
        secret: 'test-refresh-secret',
      });
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('invalid token');
      });

      await expect(authService.refreshToken('bad-token')).rejects.toThrow(UnauthorizedException);
    });
  });
});
