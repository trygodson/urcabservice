import { Module } from '@nestjs/common';
import { RidesService } from './rides.service';
import { FirebaseRideService } from './firebase-ride.service';
import { FirebaseRideController } from './firebase-ride.controller';
import {
  DatabaseModule,
  DriverEvp,
  DriverEvpRepository,
  DriverEvpSchema,
  DriverLocation,
  DriverLocationSchema,
  NotificationsModule,
  PricingZone,
  PricingZoneRepository,
  PricingZoneSchema,
  Rating,
  RatingRepository,
  RatingSchema,
  Ride,
  RideRepository,
  RideSchema,
  User,
  UserRepository,
  UserSchema,
  Vehicle,
  VehicleRepository,
  VehicleSchema,
  VehicleType,
  VehicleTypeRepository,
  VehicleTypeSchema,
  Wallet,
  WalletRepository,
  WalletSchema,
  WalletTransaction,
  WalletTransactionSchema,
} from '@urcab-workspace/shared';
import { RidesController } from './rides.controller';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { DriverLocationRepository } from './repository/driver-location.repository';
import { JwtStrategy, LocalStrategy } from '../auth/strategies';
import { RideWebSocketService } from './ride-websocket.service';
import { RedisService } from './redis.service';
import { RideGateway } from './gateway/ride.gateway';

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
      { name: Vehicle.name, schema: VehicleSchema },
      { name: Rating.name, schema: RatingSchema },
      { name: DriverLocation.name, schema: DriverLocationSchema },
      { name: DriverEvp.name, schema: DriverEvpSchema },
      { name: VehicleType.name, schema: VehicleTypeSchema },
      { name: PricingZone.name, schema: PricingZoneSchema },
      { name: Wallet.name, schema: WalletSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [RidesController],
  providers: [
    RidesService,
    RideWebSocketService,
    RedisService,
    RideGateway,
    VehicleRepository,
    UserRepository,
    RideRepository,
    DriverLocationRepository,
    RatingRepository,
    VehicleTypeRepository,
    DriverEvpRepository,
    PricingZoneRepository,
    WalletRepository,
  ],
  exports: [RidesService, RideWebSocketService, RideGateway],
})
export class RidesModule {
  constructor(private readonly rideWebSocketService: RideWebSocketService, private readonly rideGateway: RideGateway) {
    // Resolve circular dependency
    this.rideWebSocketService.setGateway(this.rideGateway);
  }
}
