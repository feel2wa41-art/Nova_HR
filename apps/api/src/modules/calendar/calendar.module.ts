import { Module } from '@nestjs/common';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { PrismaService } from '../../shared/services/prisma.service';

@Module({
  controllers: [CalendarController],
  providers: [CalendarService, PrismaService],
  exports: [CalendarService],
})
export class CalendarModule {}