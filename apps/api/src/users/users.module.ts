import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../shared/prisma/prisma.module';
import { EmailModule } from '../modules/email/email.module';

@Module({
  imports: [PrismaModule, EmailModule],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService]
})
export class UsersModule {}
