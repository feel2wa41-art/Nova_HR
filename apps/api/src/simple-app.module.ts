import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { SharedModule } from './shared/shared.module';
import { AuthModule } from './modules/auth/auth.module';
import { CompanyRequestModule } from './modules/company-request/company-request.module';
import { EmailModule } from './modules/email/email.module';
import { ApprovalModule } from './modules/approval/approval.module';
import awsConfig from './config/aws.config';

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
    ApprovalModule,
  ],
})
export class SimpleAppModule {}