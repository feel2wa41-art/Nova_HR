import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

import { SharedModule } from './shared/shared.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CompanyModule } from './modules/company/company.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
// import { LeaveModule } from './modules/leave/leave.module';
import { ApprovalModule } from './modules/approval/approval.module';
import { UploadModule } from './modules/upload/upload.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SettingsModule } from './modules/settings/settings.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AttitudeModule } from './modules/attitude/attitude.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
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

    // Scheduling
    ScheduleModule.forRoot(),

    // Core modules
    SharedModule,
    AuthModule,
    UsersModule,
    CompanyModule,
    AttendanceModule,
    // LeaveModule,
    ApprovalModule,
    UploadModule,
    NotificationModule,
    ReportsModule,
    SettingsModule,
    AttitudeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}