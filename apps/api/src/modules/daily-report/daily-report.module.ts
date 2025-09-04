import { Module } from '@nestjs/common';
import { DailyReportController } from './daily-report.controller';
import { DailyReportService } from './daily-report.service';
import { ProgramCategoryService } from './program-category.service';
import { PrismaService } from '../../shared/services/prisma.service';

@Module({
  controllers: [DailyReportController],
  providers: [DailyReportService, ProgramCategoryService, PrismaService],
  exports: [DailyReportService, ProgramCategoryService]
})
export class DailyReportModule {}