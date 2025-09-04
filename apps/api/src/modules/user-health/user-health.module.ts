import { Module } from '@nestjs/common';
import { UserHealthController } from './user-health.controller';
import { UserHealthService } from './user-health.service';
import { PrismaService } from '../../shared/services/prisma.service';

@Module({
  controllers: [UserHealthController],
  providers: [UserHealthService, PrismaService],
  exports: [UserHealthService],
})
export class UserHealthModule {}