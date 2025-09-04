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
import awsConfig from './config/aws.config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

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

    // Essential modules only
    SharedModule,
    AuthModule,
    CompanyRequestModule,
    EmailModule,
    DailyReportModule,
    WeeklyReportModule,
    ReferenceDocumentModule,
    CalendarModule,
    HrCommunityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}