import { Module } from '@nestjs/common';
import { WeeklyReportController } from './weekly-report.controller';
import { WeeklyReportService } from './weekly-report.service';
import { PrismaService } from '../../shared/services/prisma.service';

@Module({
  controllers: [WeeklyReportController],
  providers: [WeeklyReportService, PrismaService],
  exports: [WeeklyReportService]
})
export class WeeklyReportModule {}