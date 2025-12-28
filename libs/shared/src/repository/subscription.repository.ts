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
   * Returns paid subscription if exists, otherwise returns free subscription
   */
  async findActiveSubscription(driverId: string): Promise<SubscriptionDocument | null> {
    const now = new Date();

    // First check for paid subscriptions
    const paidSubscription = await this.findOne({
      driverId,
      status: 'active',
      type: { $ne: 'free' },
      startDate: { $lte: now },
      endDate: { $gte: now },
    });

    if (paidSubscription) {
      return paidSubscription;
    }

    // If no paid subscription, return free subscription (or create if doesn't exist)
    return this.getOrCreateFreeSubscription(driverId);
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

  /**
   * Get or create free subscription for driver
   */
  async getOrCreateFreeSubscription(driverId: string): Promise<SubscriptionDocument> {
    const now = new Date();

    // Check if driver already has an active free subscription
    let existingFreeSubscription = await this.findOne({
      driverId,
      type: 'free',
      status: 'active',
    });

    if (existingFreeSubscription) {
      // Reset daily count if it's a new day
      const lastRequestDate = existingFreeSubscription.lastRideRequestDate
        ? new Date(existingFreeSubscription.lastRideRequestDate)
        : null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (!lastRequestDate || lastRequestDate < today) {
        // Reset daily count for new day
        existingFreeSubscription = await this.findOneAndUpdate(
          { _id: existingFreeSubscription._id },
          {
            dailyRideRequests: 0,
            lastRideRequestDate: today,
          },
        );
      }

      return existingFreeSubscription;
    }

    // Create new free subscription
    const newFreeSubscription = await this.model.create({
      _id: new Types.ObjectId(),
      driverId: new Types.ObjectId(driverId),
      planId: null, // Free plan doesn't have a planId
      type: 'free',
      status: 'active',
      startDate: now,
      endDate: new Date('2099-12-31'), // Free plan never expires
      price: 0,
      autoRenew: true,
      ridesCompleted: 0,
      totalEarnings: 0,
      dailyRideRequests: 0,
      lastRideRequestDate: now,
    });

    return newFreeSubscription.toObject() as SubscriptionDocument;
  }

  /**
   * Increment daily ride requests for free plan only
   * Paid subscriptions don't need tracking
   */
  async incrementDailyRideRequests(driverId: string): Promise<void> {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // Check if driver has a paid subscription (unlimited rides, no need to track)
    const paidSubscription = await this.findOne({
      driverId,
      status: 'active',
      type: { $ne: 'free' },
      startDate: { $lte: now },
      endDate: { $gte: now },
    });

    // If paid subscription exists, don't increment (unlimited)
    if (paidSubscription) {
      return;
    }

    // Get or create free subscription
    const freeSubscription = await this.getOrCreateFreeSubscription(driverId);

    // Reset if new day
    const lastRequestDate = freeSubscription.lastRideRequestDate
      ? new Date(freeSubscription.lastRideRequestDate)
      : null;

    let updateData: any = {};
    if (!lastRequestDate || lastRequestDate < today) {
      updateData.dailyRideRequests = 1;
      updateData.lastRideRequestDate = today;
    } else {
      updateData.dailyRideRequests = (freeSubscription.dailyRideRequests || 0) + 1;
    }

    await this.findOneAndUpdate({ _id: freeSubscription._id }, updateData);
  }

  /**
   * Check if driver can accept more ride requests (for free plan)
   * Paid subscriptions have unlimited rides
   */
  async canAcceptRideRequest(driverId: string): Promise<{ canAccept: boolean; remaining: number }> {
    const now = new Date();

    // Check if driver has a paid subscription
    const paidSubscription = await this.findOne({
      driverId,
      status: 'active',
      type: { $ne: 'free' },
      startDate: { $lte: now },
      endDate: { $gte: now },
    });

    // Paid subscriptions have unlimited rides
    if (paidSubscription) {
      return { canAccept: true, remaining: Infinity };
    }

    // Check free subscription limits
    const freeSubscription = await this.findOne({
      driverId,
      type: 'free',
      status: 'active',
    });

    // If no free subscription, create one and allow
    if (!freeSubscription) {
      await this.getOrCreateFreeSubscription(driverId);
      return { canAccept: true, remaining: 3 };
    }

    const dailyLimit = 3;
    const currentCount = freeSubscription.dailyRideRequests || 0;
    const remaining = Math.max(0, dailyLimit - currentCount);

    return {
      canAccept: currentCount < dailyLimit,
      remaining,
    };
  }

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
