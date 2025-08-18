import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractRepository } from '../database';
import { Notification, NotificationDocument } from '../models';

@Injectable()
export class NotificationRepository extends AbstractRepository<NotificationDocument> {
  protected readonly logger = new Logger(NotificationRepository.name);

  constructor(@InjectModel(Notification.name) notificationModel: Model<NotificationDocument>) {
    super(notificationModel);
  }

  /**
   * Find notifications by user ID
   */
  async findByUserId(userId: string): Promise<NotificationDocument[]> {
    return this.model.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  /**
   * Find unread notifications for a user
   */
  async findUnreadNotifications(userId: string): Promise<NotificationDocument[]> {
    return this.find({
      userId,
      readAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    });
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.model
      .countDocuments({
        userId,
        readAt: { $exists: false },
        expiresAt: { $gt: new Date() },
      })
      .exec();
  }

  /**
   * Find notifications by type
   */
  async findByType(type: string): Promise<NotificationDocument[]> {
    return this.find({ type });
  }

  /**
   * Find notifications by priority
   */
  async findByPriority(priority: string): Promise<NotificationDocument[]> {
    return this.find({ priority });
  }

  /**
   * Find notifications by status
   */
  async findByStatus(status: string): Promise<NotificationDocument[]> {
    return this.find({ status });
  }

  /**
   * Get notifications with pagination
   */
  async getNotificationsWithPagination(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<NotificationDocument[]> {
    return this.model
      .find({
        userId,
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<NotificationDocument> {
    return this.findOneAndUpdate(
      { _id: notificationId },
      {
        readAt: new Date(),
        status: 'read',
      },
    );
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.model
      .updateMany(
        {
          userId,
          readAt: { $exists: false },
        },
        {
          readAt: new Date(),
          status: 'read',
        },
      )
      .exec();
  }

  /**
   * Update notification delivery status
   */
  async updateDeliveryStatus(
    notificationId: string,
    status: string,
    deliveredAt?: Date,
    errorMessage?: string,
  ): Promise<NotificationDocument> {
    const updateData: any = { status };

    if (deliveredAt) {
      updateData.deliveredAt = deliveredAt;
    }

    if (errorMessage) {
      updateData.errorMessage = errorMessage;
      updateData.retryCount = { $inc: 1 };
      updateData.lastRetryAt = new Date();
    }

    return this.findOneAndUpdate({ _id: notificationId }, updateData);
  }

  /**
   * Find scheduled notifications that are ready to be sent
   */
  async findScheduledNotificationsReadyToSend(): Promise<NotificationDocument[]> {
    return this.find({
      scheduledAt: { $lte: new Date() },
      status: 'sent', // Initial status for scheduled notifications
      sentAt: { $exists: false },
    });
  }

  /**
   * Find failed notifications for retry
   */
  async findFailedNotificationsForRetry(maxRetries: number = 3): Promise<NotificationDocument[]> {
    return this.find({
      status: 'failed',
      retryCount: { $lt: maxRetries },
      $or: [
        { lastRetryAt: { $exists: false } },
        { lastRetryAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) } }, // 5 minutes ago
      ],
    });
  }

  /**
   * Find expired notifications for cleanup
   */
  async findExpiredNotifications(): Promise<NotificationDocument[]> {
    return this.find({
      expiresAt: { $lt: new Date() },
    });
  }

  /**
   * Delete expired notifications
   */
  async deleteExpiredNotifications(): Promise<void> {
    await this.model
      .deleteMany({
        expiresAt: { $lt: new Date() },
      })
      .exec();
  }

  /**
   * Update push notification status
   */
  async updatePushNotificationStatus(
    notificationId: string,
    isPushSent: boolean,
    pushNotificationId?: string,
  ): Promise<NotificationDocument> {
    const updateData: any = { isPushSent };

    if (pushNotificationId) {
      updateData.pushNotificationId = pushNotificationId;
    }

    return this.findOneAndUpdate({ _id: notificationId }, updateData);
  }

  /**
   * Update email notification status
   */
  async updateEmailNotificationStatus(notificationId: string, isEmailSent: boolean): Promise<NotificationDocument> {
    return this.findOneAndUpdate({ _id: notificationId }, { isEmailSent });
  }

  /**
   * Update SMS notification status
   */
  async updateSMSNotificationStatus(notificationId: string, isSMSSent: boolean): Promise<NotificationDocument> {
    return this.findOneAndUpdate({ _id: notificationId }, { isSMSSent });
  }

  /**
   * Find notifications by related entity
   */
  async findByRelatedEntity(relatedEntityId: string, relatedEntityType: string): Promise<NotificationDocument[]> {
    return this.find({
      relatedEntityId,
      relatedEntityType,
    });
  }

  /**
   * Get notification statistics
   */
  async getNotificationStatistics(): Promise<any> {
    return this.model
      .aggregate([
        {
          $group: {
            _id: null,
            totalNotifications: { $sum: 1 },
            sentNotifications: {
              $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] },
            },
            deliveredNotifications: {
              $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] },
            },
            readNotifications: {
              $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] },
            },
            failedNotifications: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
            },
            pushNotificationsSent: {
              $sum: { $cond: ['$isPushSent', 1, 0] },
            },
            emailNotificationsSent: {
              $sum: { $cond: ['$isEmailSent', 1, 0] },
            },
            smsNotificationsSent: {
              $sum: { $cond: ['$isSMSSent', 1, 0] },
            },
          },
        },
      ])
      .exec();
  }

  /**
   * Get notification statistics by type
   */
  async getNotificationStatsByType(): Promise<any> {
    return this.model
      .aggregate([
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            readCount: {
              $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] },
            },
            failedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
            },
            averageRetryCount: { $avg: '$retryCount' },
          },
        },
        { $sort: { count: -1 } },
      ])
      .exec();
  }

  /**
   * Get user notification preferences (based on read/unread patterns)
   */
  async getUserNotificationPreferences(userId: string): Promise<any> {
    return this.model
      .aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: '$type',
            totalReceived: { $sum: 1 },
            totalRead: {
              $sum: { $cond: [{ $exists: ['$readAt', true] }, 1, 0] },
            },
          },
        },
        {
          $addFields: {
            readRate: { $divide: ['$totalRead', '$totalReceived'] },
          },
        },
        { $sort: { readRate: -1 } },
      ])
      .exec();
  }

  /**
   * Find high-priority unread notifications
   */
  async findHighPriorityUnreadNotifications(userId: string): Promise<NotificationDocument[]> {
    return this.find({
      userId,
      priority: { $in: ['high', 'urgent'] },
      readAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    });
  }

  /**
   * Create bulk notifications
   */
  async createBulkNotifications(notifications: any[]): Promise<any[]> {
    return this.model.insertMany(notifications);
  }

  /**
   * Find notifications by tags
   */
  async findByTags(tags: string[]): Promise<NotificationDocument[]> {
    return this.find({
      tags: { $in: tags },
    });
  }
}
