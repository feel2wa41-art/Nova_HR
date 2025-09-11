import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ApprovalController } from './approval.controller';
import { ApprovalService } from './approval.service';
import { FormTemplateController } from './form-template.controller';
import { FormTemplateService } from './form-template.service';
import { SharedModule } from '../../shared/shared.module';
import { EmailModule } from '../email/email.module';
// import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    SharedModule,
    EmailModule,
    // NotificationModule,
    JwtModule.register({}), // Will use global config
  ],
  controllers: [ApprovalController, FormTemplateController],
  providers: [ApprovalService, FormTemplateService],
  exports: [ApprovalService, FormTemplateService],
})
export class ApprovalModule {}