import { Module } from '@nestjs/common';
import { AttitudeController } from './attitude.controller';
import { AttitudeService } from './attitude.service';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [SharedModule],
  controllers: [AttitudeController],
  providers: [AttitudeService],
  exports: [AttitudeService],
})
export class AttitudeModule {}