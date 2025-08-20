import { Global, Module } from '@nestjs/common';
import { PrismaService } from './services/prisma.service';
import { HashService } from './services/hash.service';

@Global()
@Module({
  providers: [PrismaService, HashService],
  exports: [PrismaService, HashService],
})
export class SharedModule {}