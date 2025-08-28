import { Module } from '@nestjs/common';
import { RidesService } from './rides.service';
import { FirebaseRideService } from './firebase-ride.service';
import { FirebaseRideController } from './firebase-ride.controller';
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
} from '@urcab-workspace/shared';
import { RidesController } from './rides.controller';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { DriverLocationRepository } from './repository/driver-location.repository';
import { JwtStrategy, LocalStrategy } from '../auth/strategies';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => {
        return {
          secret: configService.getOrThrow('JWT_SECRET'),
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
    ]),
    NotificationsModule,
  ],
  controllers: [RidesController, FirebaseRideController],
  providers: [RidesService, FirebaseRideService, UserRepository, RideRepository, DriverLocationRepository],
  exports: [FirebaseRideService],
})
export class RidesModule {}
