import { Module } from '@nestjs/common';
import {
  DatabaseModule,
  Ride,
  RideSchema,
  User,
  UserSchema,
  DriverDocument,
  DriverDocumentSchema,
  VehicleDocumentRecord,
  VehicleDocumentSchema,
  DriverLocation,
  DriverLocationSchema,
  DriverEvp,
  DriverEvpSchema,
} from '@urcab-workspace/shared';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: Ride.name, schema: RideSchema },
      { name: User.name, schema: UserSchema },
      { name: DriverDocument.name, schema: DriverDocumentSchema },
      { name: VehicleDocumentRecord.name, schema: VehicleDocumentSchema },
      { name: DriverLocation.name, schema: DriverLocationSchema },
      { name: DriverEvp.name, schema: DriverEvpSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}

