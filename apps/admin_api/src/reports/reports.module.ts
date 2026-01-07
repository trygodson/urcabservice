import { Module } from '@nestjs/common';
import { DatabaseModule, PricingZone, PricingZoneRepository, PricingZoneSchema, Ride, RideSchema } from '@urcab-workspace/shared';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: Ride.name, schema: RideSchema },
      { name: PricingZone.name, schema: PricingZoneSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService, PricingZoneRepository],
  exports: [ReportsService],
})
export class ReportsModule {}

