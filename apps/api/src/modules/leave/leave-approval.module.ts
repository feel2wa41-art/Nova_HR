import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LeaveApprovalController } from './leave-approval.controller';
import { SharedModule } from '../../shared/shared.module';
import { ApprovalModule } from '../approval/approval.module';

@Module({
  imports: [
    SharedModule,
    ApprovalModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET') || 'nova-hr-secret-key',
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [LeaveApprovalController],
})
export class LeaveApprovalModule {}