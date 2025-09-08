import { Module } from '@nestjs/common';
import { FeatureConfigService } from './feature-config.service';
import { FeatureConfigController } from './feature-config.controller';
import { PrismaModule } from '../shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [FeatureConfigService],
  controllers: [FeatureConfigController],
  exports: [FeatureConfigService]
})
export class FeatureConfigModule {}
