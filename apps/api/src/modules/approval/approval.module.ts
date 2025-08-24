import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ApprovalController } from './approval.controller';
import { ApprovalService } from './approval.service';
import { SharedModule } from '../../shared/shared.module';
// import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    SharedModule,
    // NotificationModule,
    JwtModule.register({}), // Will use global config
  ],
  controllers: [ApprovalController],
  providers: [ApprovalService],
  exports: [ApprovalService],
})
export class ApprovalModule {}