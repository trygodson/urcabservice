import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import {
  DatabaseModule,
  DriverLocation,
  DriverLocationSchema,
  Ride,
  RideSchema,
  User,
  UserSchema,
} from '@urcab-workspace/shared';
import { DriverLocationRepository } from './repository/driver-location.repository';
import { DriverLocationController } from './driverLocation.controller';
import { DriverLocationService } from './driverLocation.service';

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
    ]),
  ],
  controllers: [DriverLocationController],
  providers: [DriverLocationRepository, DriverLocationService],
})
export class DriverLocationModule {}
