import { Module } from '@nestjs/common';
import { CompanyRequestController, CompanyRequestAuthController } from './company-request.controller';
import { CompanyRequestService } from './company-request.service';
import { PrismaService } from '../../shared/services/prisma.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [CompanyRequestController, CompanyRequestAuthController],
  providers: [CompanyRequestService, PrismaService],
  exports: [CompanyRequestService]
})
export class CompanyRequestModule {}