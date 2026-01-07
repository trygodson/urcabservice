import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  DatabaseModule,
  DriverDocument,
  DriverDocumentSchema,
  DriverLocation,
  DriverLocationSchema,
  FirebaseNotificationService,
  NotificationsModule,
  Rating,
  RatingRepository,
  RatingSchema,
  Ride,
  RideRepository,
  RideSchema,
  Subscription,
  SubscriptionPlan,
  SubscriptionPlanRepository,
  SubscriptionPlanSchema,
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
import { DriverDocumentRepository } from './repository/driveDocument.repository';
import { DriverDocumentController } from './driverDocument.controller';
import { DrivingLicenseDocumentService } from './drivingLicenseDocument.service';
import { NRICDocumentService } from './nricDocument.service';
import { PamanduDocumentService } from './pamanduDocument.service';
import { PassportDocumentService } from './passportDocument.service';
import { PSVLicenseDocumentService } from './psvLicenseDocument.service';
import { TaxiPermitDocumentService } from './taxiDocument.service';
import { DocumentVerificationStatusService } from './documentVerification.service';
import { DriverController } from './driver.controller';
import { DriverService } from './driver.service';

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
      { name: Vehicle.name, schema: VehicleSchema },
      { name: Rating.name, schema: RatingSchema },
      { name: DriverLocation.name, schema: DriverLocationSchema },
      { name: DriverDocument.name, schema: DriverDocumentSchema },
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: Wallet.name, schema: WalletSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
    ]),
    NotificationsModule,
  ],
  providers: [
    DrivingLicenseDocumentService,
    NRICDocumentService,
    PamanduDocumentService,
    PassportDocumentService,
    PSVLicenseDocumentService,
    TaxiPermitDocumentService,
    DocumentVerificationStatusService,
    DriverDocumentRepository,
    RideRepository,
    SubscriptionPlanRepository,
    SubscriptionRepository,
    UserRepository,
    DriverService,
    WalletRepository,
    VehicleRepository,
    RatingRepository,
  ],
  controllers: [DriverDocumentController, DriverController],
})
export class DriverModule {}
