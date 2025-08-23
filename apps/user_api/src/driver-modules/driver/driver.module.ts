import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  DatabaseModule,
  DriverDocument,
  DriverDocumentSchema,
  DriverLocation,
  DriverLocationSchema,
  Ride,
  RideSchema,
  User,
  UserSchema,
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
      { name: DriverDocument.name, schema: DriverDocumentSchema },
    ]),
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
  ],
  controllers: [DriverDocumentController],
})
export class DriverModule {}
