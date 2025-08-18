import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractRepository } from '../database';
import { Rating, RatingDocument } from '../models';

@Injectable()
export class RatingRepository extends AbstractRepository<RatingDocument> {
  protected readonly logger = new Logger(RatingRepository.name);

  constructor(@InjectModel(Rating.name) ratingModel: Model<RatingDocument>) {
    super(ratingModel);
  }

  /**
   * Find ratings given by a user
   */
  async findByRaterId(raterId: string): Promise<RatingDocument[]> {
    return this.find({ raterId });
  }

  /**
   * Find ratings received by a user
   */
  async findByRatedUserId(ratedUserId: string): Promise<RatingDocument[]> {
    return this.find({ ratedUserId });
  }

  /**
   * Find rating for a specific ride
   */
  async findByRideId(rideId: string): Promise<RatingDocument | null> {
    return this.findOne({ rideId });
  }

  /**
   * Check if rating already exists for a ride and rater
   */
  async existsForRide(rideId: string, raterId: string): Promise<boolean> {
    const rating = await this.findOne({ rideId, raterId });
    return !!rating;
  }

  /**
   * Get average rating for a user
   */
  async getAverageRating(userId: string): Promise<number> {
    const result = await this.model
      .aggregate([
        { $match: { ratedUserId: userId, isVerified: true } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$overallRating' },
            totalRatings: { $sum: 1 },
          },
        },
      ])
      .exec();

    return result.length > 0 ? result[0].averageRating : 0;
  }

  /**
   * Get detailed rating statistics for a user
   */
  async getRatingStatistics(userId: string): Promise<any> {
    return this.model
      .aggregate([
        { $match: { ratedUserId: userId, isVerified: true } },
        {
          $group: {
            _id: null,
            averageOverallRating: { $avg: '$overallRating' },
            averagePunctuality: { $avg: '$punctualityRating' },
            averageCommunication: { $avg: '$communicationRating' },
            averageVehicleCondition: { $avg: '$vehicleConditionRating' },
            averageDrivingSkill: { $avg: '$drivingSkillRating' },
            averageProfessionalism: { $avg: '$professionalismRating' },
            totalRatings: { $sum: 1 },
            fiveStarCount: {
              $sum: { $cond: [{ $eq: ['$overallRating', 5] }, 1, 0] },
            },
            fourStarCount: {
              $sum: { $cond: [{ $eq: ['$overallRating', 4] }, 1, 0] },
            },
            threeStarCount: {
              $sum: { $cond: [{ $eq: ['$overallRating', 3] }, 1, 0] },
            },
            twoStarCount: {
              $sum: { $cond: [{ $eq: ['$overallRating', 2] }, 1, 0] },
            },
            oneStarCount: {
              $sum: { $cond: [{ $eq: ['$overallRating', 1] }, 1, 0] },
            },
          },
        },
      ])
      .exec();
  }

  /**
   * Find public ratings for a user with pagination
   */
  async findPublicRatingsWithPagination(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<RatingDocument[]> {
    return this.model
      .find({
        ratedUserId: userId,
        isPublic: true,
        isVerified: true,
        isFlagged: false,
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('raterId', 'firstName lastName')
      .select('-raterId.phone -raterId.email') // Exclude sensitive info
      .exec();
  }

  /**
   * Find ratings with comments
   */
  async findRatingsWithComments(userId: string): Promise<RatingDocument[]> {
    return this.find({
      ratedUserId: userId,
      comment: { $exists: true, $ne: '' },
      isVerified: true,
      isFlagged: false,
    });
  }

  /**
   * Find flagged ratings for admin review
   */
  async findFlaggedRatings(): Promise<RatingDocument[]> {
    return this.model
      .find({ isFlagged: true })
      .sort({ flaggedAt: -1 })
      .populate('raterId', 'firstName lastName')
      .populate('ratedUserId', 'firstName lastName')
      .populate('flaggedByAdminId', 'firstName lastName')
      .exec();
  }

  /**
   * Flag a rating for review
   */
  async flagRating(ratingId: string, flagReason: string, flaggedByAdminId: string): Promise<RatingDocument> {
    return this.findOneAndUpdate(
      { _id: ratingId },
      {
        isFlagged: true,
        flagReason,
        flaggedByAdminId,
        flaggedAt: new Date(),
      },
    );
  }

  /**
   * Verify a rating
   */
  async verifyRating(ratingId: string): Promise<RatingDocument> {
    return this.findOneAndUpdate({ _id: ratingId }, { isVerified: true });
  }

  /**
   * Add driver response to a rating
   */
  async addDriverResponse(ratingId: string, driverResponse: string): Promise<RatingDocument> {
    return this.findOneAndUpdate(
      { _id: ratingId },
      {
        driverResponse,
        driverResponseAt: new Date(),
      },
    );
  }

  /**
   * Find ratings by tags
   */
  async findByTags(tags: string[]): Promise<RatingDocument[]> {
    return this.find({
      tags: { $in: tags },
      isVerified: true,
      isFlagged: false,
    });
  }

  /**
   * Get most common positive and negative feedback tags
   */
  async getCommonTags(userId: string): Promise<any> {
    return this.model
      .aggregate([
        {
          $match: {
            ratedUserId: userId,
            isVerified: true,
            tags: { $exists: true, $ne: [] },
          },
        },
        { $unwind: '$tags' },
        {
          $group: {
            _id: '$tags',
            count: { $sum: 1 },
            avgRating: { $avg: '$overallRating' },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ])
      .exec();
  }

  /**
   * Get rating trends over time
   */
  async getRatingTrends(userId: string, months: number = 6): Promise<any> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    return this.model
      .aggregate([
        {
          $match: {
            ratedUserId: userId,
            createdAt: { $gte: startDate },
            isVerified: true,
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            averageRating: { $avg: '$overallRating' },
            ratingCount: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ])
      .exec();
  }
}
