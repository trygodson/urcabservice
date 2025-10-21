import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { Rating, RatingRepository, RideRepository, RideStatus, UserRepository } from '@urcab-workspace/shared';
import { SubmitRatingDto } from 'apps/user_api/src/modules/ratings/dtos';

@Injectable()
export class DriverRatingsService {
  constructor(
    private readonly ratingRepository: RatingRepository,
    private readonly rideRepository: RideRepository,
    private readonly userRepository: UserRepository,
  ) {}

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

    // Mark the ride as rated by the driver
    await this.rideRepository.findOneAndUpdate({ _id: new Types.ObjectId(rideId) }, { isDriverRated: true });

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
   * Get ratings received by a driver
   */
  async getDriverReceivedRatings(driverId: Types.ObjectId): Promise<{
    ratings: Rating[];
    averageRating: number;
    total: number;
    statistics: any;
  }> {
    // Get all verified ratings for the driver
    const ratings = await this.ratingRepository.findByRatedUserId(driverId.toString());

    // Get average rating
    const averageRating = await this.ratingRepository.getAverageRating(driverId.toString());

    // Get rating statistics
    const ratingStats = await this.ratingRepository.getRatingStatistics(driverId.toString());

    return {
      ratings,
      averageRating,
      total: ratings.length,
      statistics: ratingStats.length > 0 ? ratingStats[0] : null,
    };
  }

  /**
   * Check if a ride has been rated by a driver
   */
  async hasDriverRatedRide(driverId: Types.ObjectId, rideId: string): Promise<boolean> {
    return this.ratingRepository.existsForRide(rideId, driverId.toString());
  }

  /**
   * Get a rating for a specific ride by a driver
   */
  async getRatingForRide(rideId: string, driverId: Types.ObjectId): Promise<Rating | null> {
    return this.ratingRepository.findOne({
      rideId: new Types.ObjectId(rideId),
      raterId: driverId,
    });
  }
}
