import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { TestSeedService } from './test-seed.service';
import { TestSeedGuard } from './test-seed.guard';
import { CreateTestUserDto, CreateTestUserResponse } from './dto/create-test-user.dto';

@Controller('test-seed')
@UseGuards(TestSeedGuard)
export class TestSeedController {
  constructor(private readonly service: TestSeedService) {}

  @Post('create-user')
  @HttpCode(HttpStatus.OK)
  async createUser(@Body() dto: CreateTestUserDto): Promise<CreateTestUserResponse> {
    return this.service.createUser(dto);
  }
}
