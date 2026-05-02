import { Module } from '@nestjs/common';
import { TestSeedController } from './test-seed.controller';
import { TestSeedService } from './test-seed.service';
import { TestSeedGuard } from './test-seed.guard';

@Module({
  controllers: [TestSeedController],
  providers: [TestSeedService, TestSeedGuard],
})
export class TestSeedModule {}
