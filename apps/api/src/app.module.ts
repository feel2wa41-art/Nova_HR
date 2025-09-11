import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { SharedModule } from './shared/shared.module';
import { AuthModule } from './modules/auth/auth.module';
import { CompanyRequestModule } from './modules/company-request/company-request.module';
import { EmailModule } from './modules/email/email.module';
import { DailyReportModule } from './modules/daily-report/daily-report.module';
import { WeeklyReportModule } from './modules/weekly-report/weekly-report.module';
import { ReferenceDocumentModule } from './modules/reference-document/reference-document.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { HrCommunityModule } from './modules/hr-community/hr-community.module';
// Now enabling all modules
import { AttendanceModule } from './modules/attendance/attendance.module';
import { CompanyModule } from './modules/company/company.module';
import { ApprovalModule } from './modules/approval/approval.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AdminModule } from './modules/admin/admin.module';
import { AttitudeModule } from './modules/attitude/attitude.module';
import { UserHealthModule } from './modules/user-health/user-health.module';
import { LeaveModule } from './modules/leave/leave.module';
import { LeaveApprovalModule } from './modules/leave/leave-approval.module';
import awsConfig from './config/aws.config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FeatureConfigModule } from './feature-config/feature-config.module';
import { UsersModule } from './modules/users/users.module';
import { CommonCodeModule } from './modules/common-code/common-code.module';
import { OvertimeModule } from './modules/overtime/overtime.module';
import { SettingsModule } from './modules/settings/settings.module';
import { UserLeaveBalanceController } from './modules/leave/user-leave-balance.controller';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [awsConfig],
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [
          {
            ttl: parseInt(process.env.THROTTLE_TTL || '60', 10) * 1000,
            limit: parseInt(process.env.THROTTLE_LIMIT || '60', 10),
          },
        ],
      }),
    }),

    // Essential modules
    SharedModule,
    AuthModule,
    // Core modules
    CompanyRequestModule,
    EmailModule,
    DailyReportModule,
    WeeklyReportModule,
    ReferenceDocumentModule,
    CalendarModule,
    HrCommunityModule,
    // Advanced modules - now enabled
    AttendanceModule,
    CompanyModule,
    ApprovalModule,
    NotificationModule,
    AdminModule,
    AttitudeModule,
    UserHealthModule,
    LeaveModule,
    LeaveApprovalModule,
    FeatureConfigModule,
    UsersModule,
    CommonCodeModule,
    OvertimeModule,
    SettingsModule,
  ],
  controllers: [AppController, UserLeaveBalanceController],
  providers: [AppService],
})
export class AppModule {}
