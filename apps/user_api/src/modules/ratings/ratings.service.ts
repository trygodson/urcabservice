import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  Rating,
  RatingRepository,
  RideRepository,
  RideStatus,
  Role,
  User,
  UserRepository,
} from '@urcab-workspace/shared';
import { SubmitRatingDto } from './dtos';

@Injectable()
export class RatingsService {
  constructor(
    private readonly ratingRepository: RatingRepository,
    private readonly rideRepository: RideRepository,
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * Submit a rating from a passenger for a driver
   */
  async submitPassengerRating(passengerId: Types.ObjectId, submitRatingDto: SubmitRatingDto): Promise<Rating> {
    const { rideId, overallRating, comment, isPublic } = submitRatingDto;

    // Check if ride exists and is completed
    const ride = await this.rideRepository.findOne({
      _id: new Types.ObjectId(rideId),
      passengerId,
      status: RideStatus.RIDE_COMPLETED,
    });

    if (!ride) {
      throw new NotFoundException('Ride not found or not completed');
    }

    if (!ride.driverId) {
      throw new BadRequestException('This ride had no driver assigned');
    }

    // Check if passenger already rated this ride
    const existingRating = await this.ratingRepository.existsForRide(rideId, passengerId.toString());
    if (existingRating) {
      throw new BadRequestException('You have already rated this ride');
    }

    // Create the rating
    const ratingData: any = {
      raterId: passengerId,
      ratedUserId: ride.driverId,
      rideId: new Types.ObjectId(rideId),
      overallRating,
      comment,
      isPublic: isPublic || false,
      isVerified: true, // Auto-verify passenger ratings
    };
    const rating = await this.ratingRepository.create(ratingData);

    // Mark the ride as rated by the passenger
    await this.rideRepository.findOneAndUpdate({ _id: new Types.ObjectId(rideId) }, { isPassengerRated: true });

    // Update driver's average rating
    await this.updateUserAverageRating(ride.driverId);

    return rating;
  }

  /**
   * Submit a rating from a driver for a passenger
   */
  async submitDriverRating(driverId: Types.ObjectId, submitRatingDto: SubmitRatingDto): Promise<Rating> {
    const { rideId, overallRating, comment, isPublic } = submitRatingDto;

    // Check if ride exists and is completed
    const ride = await this.rideRepository.findOne({
      _id: new Types.ObjectId(rideId),
      driverId,
      status: RideStatus.RIDE_COMPLETED,
    });

    if (!ride) {
      throw new NotFoundException('Ride not found or not completed');
    }

    // Check if driver already rated this ride
    const existingRating = await this.ratingRepository.existsForRide(rideId, driverId.toString());
    if (existingRating) {
      throw new BadRequestException('You have already rated this ride');
    }

    // Create the rating
    const ratingData: any = {
      raterId: driverId,
      ratedUserId: ride.passengerId,
      rideId: new Types.ObjectId(rideId),
      overallRating,
      comment,
      isPublic: isPublic || false,
      isVerified: true, // Auto-verify driver ratings
    };
    const rating = await this.ratingRepository.create(ratingData);

    // Update passenger's average rating
    await this.updateUserAverageRating(ride.passengerId);

    return rating;
  }

  /**
   * Update a user's average rating
   */
  private async updateUserAverageRating(userId: Types.ObjectId): Promise<void> {
    const averageRating = await this.ratingRepository.getAverageRating(userId.toString());

    // Update the user's average rating in their profile
    await this.userRepository.findOneAndUpdate({ _id: userId }, { $set: { averageRating: averageRating } });
  }

  /**
   * Get ratings for a user
   */
  async getUserRatings(
    userId: Types.ObjectId,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    ratings: Rating[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Get public ratings for the user with pagination
    const ratings = await this.ratingRepository.findPublicRatingsWithPagination(userId.toString(), page, limit);

    // Get total count of ratings
    const totalCount = await this.ratingRepository.count({
      ratedUserId: userId,
      isPublic: true,
      isVerified: true,
      isFlagged: false,
    });

    return {
      ratings,
      total: totalCount,
      page,
      limit,
    };
  }

  /**
   * Check if a ride has been rated by a specific user
   */
  async hasUserRatedRide(raterId: Types.ObjectId, rideId: string): Promise<boolean> {
    return this.ratingRepository.existsForRide(rideId, raterId.toString());
  }

  /**
   * Get a rating for a specific ride and user
   */
  async getRatingForRide(rideId: string, raterId: Types.ObjectId): Promise<Rating | null> {
    return this.ratingRepository.findOne({
      rideId: new Types.ObjectId(rideId),
      raterId,
    });
  }
}
