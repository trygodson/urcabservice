import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import {
  DatabaseModule,
  DriverLocation,
  DriverLocationSchema,
  NotificationsModule,
  Ride,
  RideRepository,
  RideSchema,
  User,
  UserRepository,
  UserSchema,
  Vehicle,
  VehicleRepository,
  VehicleSchema,
} from '@urcab-workspace/shared';
import { DriverRideService } from './driverRide.service';
import { DriverLocationRepository } from './repository/driver-location.repository';
import { DriverRideController } from './driverRide.controller';
import { DriverRideRepository } from './repository/driverRide.repository';
import { FirebaseRideService } from '../../modules/rides/firebase-ride.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => {
        return {
          secret: configService.getOrThrow('JWT_DSECRET'),
          signOptions: {
            expiresIn: `${configService.getOrThrow('JWT_EXPIRATION')}s`,
          },
        };
      },
      inject: [ConfigService],
    }),

    DatabaseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Ride.name, schema: RideSchema },
      { name: DriverLocation.name, schema: DriverLocationSchema },
      { name: Vehicle.name, schema: VehicleSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [DriverRideController],
  providers: [
    DriverRideService,
    FirebaseRideService,
    VehicleRepository,
    DriverRideRepository,
    RideRepository,
    UserRepository,
    DriverLocationRepository,
  ],
})
export class DriverRideModule {}
