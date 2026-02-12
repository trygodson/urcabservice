import { Module, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import {
  DatabaseModule,
  DriverEvp,
  DriverEvpRepository,
  DriverEvpSchema,
  DriverLocation,
  DriverLocationSchema,
  NotificationsModule,
  Rating,
  RatingRepository,
  RatingSchema,
  Ride,
  RideRepository,
  RideSchema,
  Subscription,
  SubscriptionRepository,
  SubscriptionSchema,
  User,
  UserRepository,
  UserSchema,
  Vehicle,
  VehicleRepository,
  VehicleSchema,
  Wallet,
  WalletRepository,
  WalletSchema,
  WalletTransaction,
  WalletTransactionSchema,
} from '@urcab-workspace/shared';
import { DriverRideService } from './driverRide.service';
import { DriverLocationRepository } from './repository/driver-location.repository';
import { DriverRideController } from './driverRide.controller';
import { DriverRideRepository } from './repository/driverRide.repository';
import { FirebaseRideService } from '../../modules/rides/firebase-ride.service';
import { RedisService } from '../../modules/rides/redis.service';
import { RidesModule } from '../../modules/rides/rides.modules';

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
      { name: Rating.name, schema: RatingSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: Wallet.name, schema: WalletSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
      { name: DriverEvp.name, schema: DriverEvpSchema },
    ]),
    NotificationsModule,
    forwardRef(() => RidesModule),
  ],
  controllers: [DriverRideController],
  providers: [
    DriverRideService,
    FirebaseRideService,
    RedisService,
    VehicleRepository,
    DriverRideRepository,
    RideRepository,
    UserRepository,
    RatingRepository,
    DriverEvpRepository,
    DriverLocationRepository,
    SubscriptionRepository,
    WalletRepository,
  ],
  exports: [DriverRideService],
})
export class DriverRideModule {}
