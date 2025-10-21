import { Module } from '@nestjs/common';
import { DriverRatingsController } from './driverRatings.controller';
import { DriverRatingsService } from './driverRatings.service';
import {
  DatabaseModule,
  Rating,
  RatingRepository,
  RatingSchema,
  Ride,
  RideRepository,
  RideSchema,
  User,
  UserRepository,
  UserSchema,
} from '@urcab-workspace/shared';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: Rating.name, schema: RatingSchema },
      { name: Ride.name, schema: RideSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [DriverRatingsController],
  providers: [DriverRatingsService, RatingRepository, RideRepository, UserRepository],
  exports: [DriverRatingsService],
})
export class DriverRatingsModule {}
