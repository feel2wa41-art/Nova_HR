import { Module } from '@nestjs/common';
import { CommonCodeController } from './common-code.controller';
import { CommonCodeService } from './common-code.service';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CommonCodeController],
  providers: [CommonCodeService],
  exports: [CommonCodeService],
})
export class CommonCodeModule {}