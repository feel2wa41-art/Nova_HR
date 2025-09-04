import { Module } from '@nestjs/common';
import { ReferenceDocumentController } from './reference-document.controller';
import { ReferenceDocumentService } from './reference-document.service';
import { PrismaService } from '../../shared/services/prisma.service';

@Module({
  controllers: [ReferenceDocumentController],
  providers: [ReferenceDocumentService, PrismaService],
  exports: [ReferenceDocumentService],
})
export class ReferenceDocumentModule {}