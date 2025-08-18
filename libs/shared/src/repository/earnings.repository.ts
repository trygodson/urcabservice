import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractRepository } from '../database';
import { Earnings, EarningsDocument } from '../models';

@Injectable()
export class EarningsRepository extends AbstractRepository<EarningsDocument> {
  protected readonly logger = new Logger(EarningsRepository.name);

  constructor(@InjectModel(Earnings.name) earningsModel: Model<EarningsDocument>) {
    super(earningsModel);
  }

  /**
   * Find earnings by driver ID
   */
  async findByDriverId(driverId: string): Promise<EarningsDocument[]> {
    return this.model.find({ driverId }).sort({ earnedDate: -1 }).exec();
  }

  /**
   * Find earnings by ride ID
   */
  async findByRideId(rideId: string): Promise<EarningsDocument | null> {
    return this.findOne({ rideId });
  }

  /**
   * Find earnings by subscription ID
   */
  async findBySubscriptionId(subscriptionId: string): Promise<EarningsDocument[]> {
    return this.find({ subscriptionId });
  }

  /**
   * Get driver earnings for a date range
   */
  async getDriverEarningsForPeriod(driverId: string, startDate: Date, endDate: Date): Promise<EarningsDocument[]> {
    return this.model
      .find({
        driverId,
        earnedDate: {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .sort({ earnedDate: -1 })
      .exec();
  }

  /**
   * Get driver daily earnings summary
   */
  async getDailyEarningsSummary(driverId: string, date: Date): Promise<any> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.model
      .aggregate([
        {
          $match: {
            driverId,
            earnedDate: {
              $gte: startOfDay,
              $lte: endOfDay,
            },
          },
        },
        {
          $group: {
            _id: null,
            totalRides: { $sum: 1 },
            totalFareAmount: { $sum: '$fareAmount' },
            totalDriverEarnings: { $sum: '$driverEarnings' },
            totalBonusAmount: { $sum: '$bonusAmount' },
            totalTipAmount: { $sum: '$tipAmount' },
            totalNetEarnings: { $sum: '$netEarnings' },
            totalPlatformFee: { $sum: '$platformFee' },
            totalDistance: { $sum: '$distance' },
            totalDuration: { $sum: '$duration' },
            averageRideValue: { $avg: '$fareAmount' },
          },
        },
      ])
      .exec();
  }

  /**
   * Get driver weekly earnings summary
   */
  async getWeeklyEarningsSummary(driverId: string, weekStartDate: Date): Promise<any> {
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    weekEndDate.setHours(23, 59, 59, 999);

    return this.model
      .aggregate([
        {
          $match: {
            driverId,
            earnedDate: {
              $gte: weekStartDate,
              $lte: weekEndDate,
            },
          },
        },
        {
          $group: {
            _id: null,
            totalRides: { $sum: 1 },
            totalFareAmount: { $sum: '$fareAmount' },
            totalDriverEarnings: { $sum: '$driverEarnings' },
            totalBonusAmount: { $sum: '$bonusAmount' },
            totalTipAmount: { $sum: '$tipAmount' },
            totalNetEarnings: { $sum: '$netEarnings' },
            totalPlatformFee: { $sum: '$platformFee' },
            totalDistance: { $sum: '$distance' },
            totalDuration: { $sum: '$duration' },
            daysActive: {
              $addToSet: { $dateToString: { format: '%Y-%m-%d', date: '$earnedDate' } },
            },
          },
        },
        {
          $addFields: {
            daysActiveCount: { $size: '$daysActive' },
            averageEarningsPerDay: { $divide: ['$totalNetEarnings', { $size: '$daysActive' }] },
          },
        },
      ])
      .exec();
  }

  /**
   * Get driver earnings with pagination
   */
  async getDriverEarningsWithPagination(
    driverId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<EarningsDocument[]> {
    return this.model
      .find({ driverId })
      .sort({ earnedDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('rideId', 'pickupLocation dropoffLocation status')
      .populate('subscriptionId', 'type startDate endDate')
      .exec();
  }

  /**
   * Get unpaid earnings for a driver
   */
  async getUnpaidEarnings(driverId: string): Promise<EarningsDocument[]> {
    return this.find({
      driverId,
      isPaidOut: false,
    });
  }

  /**
   * Get total unpaid amount for a driver
   */
  async getTotalUnpaidAmount(driverId: string): Promise<number> {
    const result = await this.model
      .aggregate([
        {
          $match: {
            driverId,
            isPaidOut: false,
          },
        },
        {
          $group: {
            _id: null,
            totalUnpaid: { $sum: '$netEarnings' },
          },
        },
      ])
      .exec();

    return result.length > 0 ? result[0].totalUnpaid : 0;
  }

  /**
   * Mark earnings as paid out
   */
  async markAsPaidOut(earningsIds: string[], payoutDate: Date, payoutReference: string): Promise<void> {
    await this.model
      .updateMany(
        { _id: { $in: earningsIds } },
        {
          isPaidOut: true,
          payoutDate,
          payoutReference,
        },
      )
      .exec();
  }

  /**
   * Get earnings by city
   */
  async getEarningsByCity(driverId: string): Promise<any> {
    return this.model
      .aggregate([
        { $match: { driverId } },
        {
          $group: {
            _id: '$city',
            totalEarnings: { $sum: '$netEarnings' },
            totalRides: { $sum: 1 },
            averageEarningPerRide: { $avg: '$netEarnings' },
          },
        },
        { $sort: { totalEarnings: -1 } },
      ])
      .exec();
  }

  /**
   * Get peak hours earnings
   */
  async getPeakHoursEarnings(driverId: string): Promise<any> {
    return this.model
      .aggregate([
        { $match: { driverId } },
        {
          $group: {
            _id: '$isPeakHours',
            totalEarnings: { $sum: '$netEarnings' },
            totalRides: { $sum: 1 },
            averageEarningPerRide: { $avg: '$netEarnings' },
            averageMultiplier: { $avg: '$peakMultiplier' },
          },
        },
      ])
      .exec();
  }

  /**
   * Get earnings trends over time
   */
  async getEarningsTrends(driverId: string, months: number = 6): Promise<any> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    return this.model
      .aggregate([
        {
          $match: {
            driverId,
            earnedDate: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$earnedDate' },
              month: { $month: '$earnedDate' },
            },
            totalEarnings: { $sum: '$netEarnings' },
            totalRides: { $sum: 1 },
            averageEarningPerRide: { $avg: '$netEarnings' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ])
      .exec();
  }

  /**
   * Get top earning drivers
   */
  async getTopEarningDrivers(limit: number = 10, period?: 'daily' | 'weekly' | 'monthly'): Promise<any> {
    let matchConditions: any = {};

    if (period === 'daily') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      matchConditions.earnedDate = { $gte: today, $lt: tomorrow };
    } else if (period === 'weekly') {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      matchConditions.earnedDate = { $gte: weekStart };
    } else if (period === 'monthly') {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      matchConditions.earnedDate = { $gte: monthStart };
    }

    return this.model
      .aggregate([
        { $match: matchConditions },
        {
          $group: {
            _id: '$driverId',
            totalEarnings: { $sum: '$netEarnings' },
            totalRides: { $sum: 1 },
            averageEarningPerRide: { $avg: '$netEarnings' },
          },
        },
        { $sort: { totalEarnings: -1 } },
        { $limit: limit },
      ])
      .exec();
  }

  /**
   * Get platform earnings statistics
   */
  async getPlatformEarningsStatistics(startDate?: Date, endDate?: Date): Promise<any> {
    let matchConditions: any = {};

    if (startDate && endDate) {
      matchConditions.earnedDate = { $gte: startDate, $lte: endDate };
    }

    return this.model
      .aggregate([
        { $match: matchConditions },
        {
          $group: {
            _id: null,
            totalRides: { $sum: 1 },
            totalFareAmount: { $sum: '$fareAmount' },
            totalDriverEarnings: { $sum: '$driverEarnings' },
            totalPlatformFees: { $sum: '$platformFee' },
            totalBonusPaid: { $sum: '$bonusAmount' },
            totalTips: { $sum: '$tipAmount' },
            averageRideValue: { $avg: '$fareAmount' },
            averageDriverEarning: { $avg: '$driverEarnings' },
            uniqueDrivers: { $addToSet: '$driverId' },
          },
        },
        {
          $addFields: {
            uniqueDriverCount: { $size: '$uniqueDrivers' },
          },
        },
      ])
      .exec();
  }
}
