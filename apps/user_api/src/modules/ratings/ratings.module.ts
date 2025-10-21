import { Module } from '@nestjs/common';
import { RatingsController } from './ratings.controller';
import { RatingsService } from './ratings.service';
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
  controllers: [RatingsController],
  providers: [RatingsService, RatingRepository, RideRepository, UserRepository],
  exports: [RatingsService],
})
export class RatingsModule {}
