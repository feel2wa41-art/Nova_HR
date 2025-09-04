import { Module } from '@nestjs/common';
import { HrCommunityController } from './hr-community.controller';
import { HrCommunityService } from './hr-community.service';
import { PrismaService } from '../../shared/services/prisma.service';
import { NotificationService } from '../../shared/services/notification.service';

@Module({
  controllers: [HrCommunityController],
  providers: [HrCommunityService, PrismaService, NotificationService],
  exports: [HrCommunityService, NotificationService],
})
export class HrCommunityModule {}