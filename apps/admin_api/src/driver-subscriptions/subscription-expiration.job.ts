import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubscriptionRepository, SubscriptionStatus, UserRepository } from '@urcab-workspace/shared';

@Injectable()
export class SubscriptionExpirationJob {
  private readonly logger = new Logger(SubscriptionExpirationJob.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly userRepository: UserRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Run daily at 9:00 AM to check for expiring and expired subscriptions
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkSubscriptionExpiration() {
    this.logger.log('Starting subscription expiration check job...');
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    try {
      // Find active subscriptions that are expiring soon (within 7 days)
      const expiringSubscriptions = await this.subscriptionRepository.model
        .find({
          status: SubscriptionStatus.ACTIVE,
          endDate: {
            $gte: now,
            $lte: sevenDaysFromNow,
          },
          type: { $ne: 'free' }, // Exclude free subscriptions
        })
        .populate('driverId', 'fullName email fcmToken')
        .populate('planId', 'name')
        .lean()
        .exec();

      this.logger.log(`Found ${expiringSubscriptions.length} subscriptions expiring soon`);

      // Process each expiring subscription
      for (const subscription of expiringSubscriptions) {
        try {
          const driver = subscription.driverId as any;
          const plan = subscription.planId as any;

          if (!driver) {
            this.logger.warn(`Driver not found for subscription ${subscription._id}`);
            continue;
          }

          // Calculate days until expiration
          const daysUntilExpiry = Math.ceil(
            (new Date(subscription.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          );

          // Emit event for expiring subscription
          this.eventEmitter.emit('subscription.expiring_soon', {
            subscriptionId: subscription._id.toString(),
            driverId: driver._id.toString(),
            driverEmail: driver.email,
            driverName: driver.fullName,
            driverFcmToken: driver.fcmToken,
            planName: plan?.name || subscription.type,
            subscriptionType: subscription.type,
            endDate: subscription.endDate,
            daysUntilExpiry,
            price: subscription.price,
            autoRenew: subscription.autoRenew,
          });

          this.logger.log(
            `Emitted expiring_soon event for subscription ${subscription._id}, expires in ${daysUntilExpiry} days`,
          );
        } catch (error) {
          this.logger.error(`Error processing expiring subscription ${subscription._id}:`, error.stack);
        }
      }

      // Find expired subscriptions that are still marked as active
      const expiredSubscriptions = await this.subscriptionRepository.model
        .find({
          status: SubscriptionStatus.ACTIVE,
          endDate: { $lt: now },
          type: { $ne: 'free' }, // Exclude free subscriptions
        })
        .populate('driverId', 'fullName email fcmToken')
        .populate('planId', 'name')
        .lean()
        .exec();

      this.logger.log(`Found ${expiredSubscriptions.length} expired subscriptions`);

      // Process each expired subscription
      for (const subscription of expiredSubscriptions) {
        try {
          // Update subscription status to expired
          await this.subscriptionRepository.findOneAndUpdate(
            { _id: subscription._id },
            {
              status: SubscriptionStatus.EXPIRED,
            },
          );

          const driver = subscription.driverId as any;
          const plan = subscription.planId as any;

          if (!driver) {
            this.logger.warn(`Driver not found for subscription ${subscription._id}`);
            continue;
          }

          // Calculate days since expiration
          const daysSinceExpiry = Math.ceil(
            (now.getTime() - new Date(subscription.endDate).getTime()) / (1000 * 60 * 60 * 24),
          );

          // Emit event for expired subscription
          this.eventEmitter.emit('subscription.expired', {
            subscriptionId: subscription._id.toString(),
            driverId: driver._id.toString(),
            driverEmail: driver.email,
            driverName: driver.fullName,
            driverFcmToken: driver.fcmToken,
            planName: plan?.name || subscription.type,
            subscriptionType: subscription.type,
            endDate: subscription.endDate,
            daysSinceExpiry,
            price: subscription.price,
            autoRenew: subscription.autoRenew,
          });

          this.logger.log(`Emitted expired event for subscription ${subscription._id}, expired ${daysSinceExpiry} days ago`);
        } catch (error) {
          this.logger.error(`Error processing expired subscription ${subscription._id}:`, error.stack);
        }
      }

      this.logger.log('Subscription expiration check job completed');
    } catch (error) {
      this.logger.error('Error in subscription expiration check job:', error.stack);
    }
  }
}
