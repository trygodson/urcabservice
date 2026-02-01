import { Module, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import {
  DatabaseModule,
  DriverDocument,
  DriverDocumentSchema,
  DriverEvp,
  DriverEvpSchema,
  IssueReport,
  IssueReportSchema,
  LoggerModule,
  Ride,
  RideSchema,
  User,
  UserSchema,
  Vehicle,
  VehicleDocumentRecord,
  VehicleDocumentSchema,
  VehicleSchema,
  WalletTransaction,
  WalletTransactionSchema,
  Settings,
  SettingsSchema,
  Rating,
  RatingSchema,
  WalletRepository,
  Wallet,
  WalletSchema,
} from '@urcab-workspace/shared';
import { AdminDriversController } from './adminDrivers.controller';
import { AdminDriversService } from './adminDrivers.service';
import {
  AdminDriverDocumentRepository,
  AdminIssueReportRepository,
  AdminRideRepository,
  AdminUserRepository,
  AdminVehicleDocumentRepository,
  AdminVehicleRepository,
  AdminDriverEvpRepository,
} from './repository';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: DriverDocument.name, schema: DriverDocumentSchema },
      { name: Vehicle.name, schema: VehicleSchema },
      { name: VehicleDocumentRecord.name, schema: VehicleDocumentSchema },
      { name: Ride.name, schema: RideSchema },
      { name: Rating.name, schema: RatingSchema },
      { name: Wallet.name, schema: WalletSchema },
      { name: IssueReport.name, schema: IssueReportSchema },
      { name: DriverEvp.name, schema: DriverEvpSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
      { name: Settings.name, schema: SettingsSchema },
      { name: Rating.name, schema: RatingSchema },
    ]),
    LoggerModule,

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
  ],
  providers: [
    AdminDriversService,
    AdminUserRepository,
    AdminDriverDocumentRepository,
    AdminRideRepository,
    AdminVehicleRepository,
    AdminVehicleDocumentRepository,
    AdminIssueReportRepository,
    AdminDriverEvpRepository,
    WalletRepository,
  ],
  controllers: [AdminDriversController],
})
export class AdminDriversModule {}
