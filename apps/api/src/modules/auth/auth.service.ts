import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TokenResponse } from './dto/token-response.dto';
import { EmailValidationService } from './email-validation.service';
import { EmailService } from '../../common/email.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailValidation: EmailValidationService,
    private emailService: EmailService,
  ) {}

  async register(dto: RegisterDto): Promise<TokenResponse> {
    const emailCheck = await this.emailValidation.validate(dto.email);
    if (!emailCheck.valid) {
      throw new BadRequestException(emailCheck.reason ?? 'Invalid email address');
    }

    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = await this.usersService.create({
      ...dto,
      password: hashedPassword,
    });

    return this.generateTokens(user.id, user.email);
  }

  async login(dto: LoginDto): Promise<TokenResponse> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user.id, user.email);
  }

  /**
   * Refresh an expired access token using a valid refresh token.
   */
  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET') || 'refresh-secret-change-me',
      });

      const user = await this.usersService.findById(payload.sub);
      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      return this.generateTokens(user.id, user.email);
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private generateTokens(userId: string, email: string): TokenResponse {
    const payload = { sub: userId, email };
    const jwtSecret = this.configService.get('JWT_SECRET');
    const jwtRefreshSecret = this.configService.get('JWT_REFRESH_SECRET');

    if (!jwtSecret || !jwtRefreshSecret) {
      throw new Error('JWT_SECRET and JWT_REFRESH_SECRET are required');
    }

    const accessToken = this.jwtService.sign(payload, {
      secret: jwtSecret,
      expiresIn: this.configService.get('JWT_EXPIRES_IN') || '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: jwtRefreshSecret,
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d',
    });

    return {
      accessToken,
      refreshToken,
      user: { id: userId, email },
    };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return { message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña' };
    }

    const resetToken = this.jwtService.sign(
      { sub: user.id, purpose: 'password-reset' },
      { secret: this.configService.get('JWT_SECRET') || 'secret', expiresIn: '1h' },
    );

    const webUrl = this.configService.get('WEB_URL') || 'http://localhost:3000';
    const resetUrl = `${webUrl}/reset-password?token=${resetToken}`;

    await this.emailService.send({
      to: email,
      subject: 'Restablece tu contraseña - Ecomerce',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
          <h2 style="color:#03045E;">Restablecer contraseña</h2>
          <p style="color:#333;">Haz clic en el botón para restablecer tu contraseña:</p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#00B4D8;color:white;text-decoration:none;border-radius:8px;font-weight:bold;">
            Restablecer contraseña
          </a>
          <p style="color:#888;font-size:12px;margin-top:16px;">Este enlace expira en 1 hora. Si no solicitaste esto, ignora este mensaje.</p>
        </div>
      `,
    });

    return { message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    let payload: { sub: string; purpose: string };
    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET') || 'secret',
      });
    } catch {
      throw new BadRequestException('Token inválido o expirado');
    }

    if (payload.purpose !== 'password-reset') {
      throw new BadRequestException('Token inválido');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.usersService.update(payload.sub, { password: hashedPassword } as any);

    return { message: 'Contraseña restablecida exitosamente' };
  }

  async validateToken(userId: string) {
    return this.validateUser(userId);
  }

  async validateUser(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }
    return user;
  }
}
