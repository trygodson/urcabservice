import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import {
  DatabaseModule,
  LoggerModule,
  User,
  UserSchema,
  Ride,
  RideSchema,
  PassengerDocument,
  PassengerDocumentSchema,
  Rating,
  RatingSchema,
  IssueReport,
  IssueReportSchema,
  EmergencyContact,
  EmergencyContactSchema,
  EmergencyContactRepository,
} from '@urcab-workspace/shared';
import { AdminPassengersController } from './adminPassengers.controller';
import { AdminPassengersService } from './adminPassengers.service';
import {
  AdminPassengerUserRepository,
  AdminPassengerRideRepository,
  AdminPassengerDocumentRepository,
  AdminPassengerRatingRepository,
  AdminPassengerReportRepository,
} from './repository';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Ride.name, schema: RideSchema },
      { name: PassengerDocument.name, schema: PassengerDocumentSchema },
      { name: Rating.name, schema: RatingSchema },
      { name: IssueReport.name, schema: IssueReportSchema },
      { name: EmergencyContact.name, schema: EmergencyContactSchema },
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
    AdminPassengersService,
    AdminPassengerUserRepository,
    AdminPassengerRideRepository,
    AdminPassengerDocumentRepository,
    AdminPassengerRatingRepository,
    AdminPassengerReportRepository,
    EmergencyContactRepository,
  ],
  controllers: [AdminPassengersController],
})
export class AdminPassengersModule {}
