import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AbstractRepository } from '../database';
import { Subscription, SubscriptionDocument } from '../models';

@Injectable()
export class SubscriptionRepository extends AbstractRepository<SubscriptionDocument> {
  protected readonly logger = new Logger(SubscriptionRepository.name);

  constructor(@InjectModel(Subscription.name) subscriptionModel: Model<SubscriptionDocument>) {
    super(subscriptionModel);
  }

  /**
   * Find subscriptions by driver ID
   */
  async findByDriverId(driverId: string): Promise<SubscriptionDocument[]> {
    return this.model
      .find({ driverId, type: { $ne: 'free' } })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Find active subscription for a driver
   * Only paid subscriptions are considered active (free plan removed)
   */
  async findActiveSubscription(driverId: string): Promise<SubscriptionDocument | null> {
    const now = new Date();

    const paidSubscription = await this.findOne({
      driverId,
      status: 'active',
      type: { $ne: 'free' },
      startDate: { $lte: now },
      endDate: { $gte: now },
    });

    return paidSubscription;
  }

  /**
   * Check if driver has active subscription
   */
  async hasActiveSubscription(driverId: string): Promise<boolean> {
    const activeSubscription = await this.findActiveSubscription(driverId);
    return !!activeSubscription;
  }

  /**
   * Find subscriptions by status
   */
  async findByStatus(status: string): Promise<SubscriptionDocument[]> {
    return this.find({ status });
  }

  /**
   * Find subscriptions by type
   */
  async findByType(type: string): Promise<SubscriptionDocument[]> {
    return this.find({ type });
  }

  /**
   * Find expiring subscriptions
   */
  async findExpiringSubscriptions(hoursFromNow: number = 24): Promise<SubscriptionDocument[]> {
    const expiryTime = new Date();
    expiryTime.setHours(expiryTime.getHours() + hoursFromNow);

    return this.model
      .find({
        status: 'active',
        endDate: {
          $gte: new Date(),
          $lte: expiryTime,
        },
      })
      .populate('driverId', 'firstName lastName email phone fcmToken')
      .exec();
  }

  /**
   * Find expired subscriptions that need status update
   */
  async findExpiredSubscriptions(): Promise<SubscriptionDocument[]> {
    return this.find({
      status: 'active',
      endDate: { $lt: new Date() },
    });
  }

  /**
   * Expire old subscriptions
   */
  async expireOldSubscriptions(): Promise<void> {
    await this.model
      .updateMany(
        {
          status: 'active',
          endDate: { $lt: new Date() },
        },
        { status: 'expired' },
      )
      .exec();
  }

  /**
   * Create new subscription
   */
  async createSubscription(subscriptionData: any): Promise<SubscriptionDocument> {
    // End any existing active subscriptions for the driver (except free plan)
    if (subscriptionData.driverId) {
      await this.model
        .updateMany(
          {
            driverId: subscriptionData.driverId,
            status: 'active',
            type: { $ne: 'free' }, // Don't expire free plans when creating paid subscriptions
          },
          { status: 'expired' },
        )
        .exec();
    }

    return this.create(subscriptionData);
  }

  // Free subscription helpers removed – only paid subscriptions are supported now

  /**
   * Renew subscription
   */
  async renewSubscription(
    currentSubscriptionId: string,
    newEndDate: Date,
    price: number,
  ): Promise<SubscriptionDocument> {
    return this.findOneAndUpdate(
      { _id: currentSubscriptionId },
      {
        endDate: newEndDate,
        price,
        lastActiveDate: new Date(),
      },
    );
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    cancellationReason: string,
    cancelledByAdminId?: string,
  ): Promise<SubscriptionDocument> {
    return this.findOneAndUpdate(
      { _id: subscriptionId },
      {
        status: 'expired',
        cancellationReason,
        cancelledAt: new Date(),
        cancelledByAdminId,
      },
    );
  }

  /**
   * Update subscription stats after ride completion
   */
  async updateSubscriptionStats(subscriptionId: string, rideEarnings: number): Promise<SubscriptionDocument> {
    return this.findOneAndUpdate(
      { _id: subscriptionId },
      {
        $inc: {
          ridesCompleted: 1,
          totalEarnings: rideEarnings,
        },
        lastActiveDate: new Date(),
      },
    );
  }

  /**
   * Approve subscription payment
   */
  async approvePayment(
    subscriptionId: string,
    approvedByAdminId: string,
    paymentDate: Date,
    paymentReference?: string,
  ): Promise<SubscriptionDocument> {
    return this.findOneAndUpdate(
      { _id: subscriptionId },
      {
        status: 'active',
        approvedByAdminId,
        approvedAt: new Date(),
        paymentDate,
        paymentReference,
      },
    );
  }

  /**
   * Get subscription statistics
   */
  async getSubscriptionStatistics(): Promise<any> {
    return this.model
      .aggregate([
        {
          $group: {
            _id: null,
            totalSubscriptions: { $sum: 1 },
            activeSubscriptions: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
            },
            expiredSubscriptions: {
              $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] },
            },
            dailySubscriptions: {
              $sum: { $cond: [{ $eq: ['$type', 'daily'] }, 1, 0] },
            },
            weeklySubscriptions: {
              $sum: { $cond: [{ $eq: ['$type', 'weekly'] }, 1, 0] },
            },
            totalRevenue: { $sum: '$price' },
            averagePrice: { $avg: '$price' },
          },
        },
      ])
      .exec();
  }

  /**
   * Get subscription performance by type
   */
  async getSubscriptionPerformanceByType(): Promise<any> {
    return this.model
      .aggregate([
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            totalRevenue: { $sum: '$price' },
            averageRides: { $avg: '$ridesCompleted' },
            averageEarnings: { $avg: '$totalEarnings' },
            activeCount: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
            },
          },
        },
      ])
      .exec();
  }

  /**
   * Find drivers with subscription in grace period
   */
  async findDriversInGracePeriod(): Promise<SubscriptionDocument[]> {
    return this.model
      .find({
        isGracePeriod: true,
        gracePeriodEndDate: { $gte: new Date() },
      })
      .populate('driverId', 'firstName lastName email phone')
      .exec();
  }

  /**
   * End grace period for expired subscriptions
   */
  async endGracePeriod(): Promise<void> {
    await this.model
      .updateMany(
        {
          isGracePeriod: true,
          gracePeriodEndDate: { $lt: new Date() },
        },
        {
          isGracePeriod: false,
          status: 'expired',
        },
      )
      .exec();
  }

  /**
   * Get driver subscription history with pagination
   */
  async getDriverSubscriptionHistory(
    driverId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<SubscriptionDocument[]> {
    return this.model
      .find({ driverId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
  }

  /**
   * Get top performing drivers by subscription type
   */
  async getTopPerformingDrivers(type: string, limit: number = 10): Promise<any> {
    return this.model
      .aggregate([
        {
          $match: {
            type,
            status: { $in: ['active', 'expired'] },
          },
        },
        {
          $group: {
            _id: '$driverId',
            totalRides: { $sum: '$ridesCompleted' },
            totalEarnings: { $sum: '$totalEarnings' },
            subscriptionCount: { $sum: 1 },
          },
        },
        { $sort: { totalEarnings: -1 } },
        { $limit: limit },
      ])
      .exec();
  }
}
