import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { BusinessTripSettingController } from './business-trip-setting.controller';
import { BusinessTripSettingService } from './business-trip-setting.service';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [
    SharedModule,
    JwtModule.register({}), // Will use global config
  ],
  controllers: [BusinessTripSettingController],
  providers: [BusinessTripSettingService],
  exports: [BusinessTripSettingService],
})
export class SettingsModule {}