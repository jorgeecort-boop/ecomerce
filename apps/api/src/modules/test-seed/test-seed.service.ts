import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../config/prisma.service';
import { CreateTestUserDto, CreateTestUserResponse } from './dto/create-test-user.dto';

@Injectable()
export class TestSeedService {
  private readonly logger = new Logger(TestSeedService.name);

  constructor(private prisma: PrismaService) {}

  async createUser(dto: CreateTestUserDto): Promise<CreateTestUserResponse> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      this.logger.log(`Test user already exists: ${dto.email}`);
      return { id: existing.id, email: existing.email, created: false };
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name ?? null,
      },
    });

    this.logger.log(`Test user created: ${dto.email}`);
    return { id: user.id, email: user.email, created: true };
  }
}
