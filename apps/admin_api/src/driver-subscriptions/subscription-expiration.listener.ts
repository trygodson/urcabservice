import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EmailNotificationService } from '@urcab-workspace/shared';
import * as admin from 'firebase-admin';
import { FirebaseAdmin, InjectFirebaseAdmin } from 'nestjs-firebase';

interface SubscriptionExpiringSoonPayload {
  subscriptionId: string;
  driverId: string;
  driverEmail: string;
  driverName: string;
  driverFcmToken?: string;
  planName: string;
  subscriptionType: string;
  endDate: Date;
  daysUntilExpiry: number;
  price: number;
  autoRenew: boolean;
}

interface SubscriptionExpiredPayload {
  subscriptionId: string;
  driverId: string;
  driverEmail: string;
  driverName: string;
  driverFcmToken?: string;
  planName: string;
  subscriptionType: string;
  endDate: Date;
  daysSinceExpiry: number;
  price: number;
  autoRenew: boolean;
}

@Injectable()
export class SubscriptionExpirationListener {
  private readonly logger = new Logger(SubscriptionExpirationListener.name);

  constructor(
    private readonly emailNotificationService: EmailNotificationService,
    @InjectFirebaseAdmin() private readonly firebase: FirebaseAdmin,
  ) {}

  @OnEvent('subscription.expiring_soon', { async: true })
  async handleSubscriptionExpiringSoon(payload: SubscriptionExpiringSoonPayload) {
    try {
      const {
        driverEmail,
        driverName,
        driverFcmToken,
        planName,
        subscriptionType,
        endDate,
        daysUntilExpiry,
        price,
        autoRenew,
      } = payload;

      // Send email notification
      const subject = `UrCab Subscription Expiring Soon - ${daysUntilExpiry} Days Remaining`;
      const html = this.getSubscriptionExpiringSoonEmailTemplate(
        driverName,
        planName,
        subscriptionType,
        endDate,
        daysUntilExpiry,
        price,
        autoRenew,
      );
      const text = `Hello ${driverName},\n\nYour subscription is expiring soon.\n\nPlan: ${planName}\nType: ${subscriptionType}\nExpiry Date: ${endDate.toLocaleDateString()}\nDays Remaining: ${daysUntilExpiry}\nPrice: RM ${price}\nAuto Renew: ${autoRenew ? 'Yes' : 'No'}\n\nPlease renew your subscription before it expires to continue providing rides.\n\nIf you have any questions, please contact our support team.`;

      await this.emailNotificationService.sendEmail({
        to: driverEmail,
        subject,
        html,
        text,
      });

      // Send push notification if FCM token is available
      if (driverFcmToken) {
        try {
          const message: admin.messaging.Message = {
            token: driverFcmToken,
            notification: {
              title: '⚠️ Subscription Expiring Soon',
              body: `Your ${planName} expires in ${daysUntilExpiry} days. Please renew to continue driving.`,
            },
            data: {
              type: 'subscription_expiring_soon',
              subscriptionId: payload.subscriptionId,
              daysUntilExpiry: daysUntilExpiry.toString(),
            },
            android: {
              priority: 'high',
              notification: {
                channelId: 'subscription_notifications',
                priority: 'high',
                defaultSound: true,
              },
            },
            apns: {
              payload: {
                aps: {
                  alert: {
                    title: '⚠️ Subscription Expiring Soon',
                    body: `Your ${planName} expires in ${daysUntilExpiry} days. Please renew to continue driving.`,
                  },
                  sound: 'default',
                  badge: 1,
                },
              },
            },
          };
          await this.firebase.messaging.send(message);
        } catch (fcmError) {
          this.logger.warn(`Failed to send FCM notification to driver ${payload.driverId}:`, fcmError.message);
        }
      }

      this.logger.log(`Subscription expiring soon notification sent to ${driverEmail} for subscription ${payload.subscriptionId}`);
    } catch (error) {
      this.logger.error(`Failed to send subscription expiring soon notification to ${payload.driverEmail}`, error.stack);
    }
  }

  @OnEvent('subscription.expired', { async: true })
  async handleSubscriptionExpired(payload: SubscriptionExpiredPayload) {
    try {
      const {
        driverEmail,
        driverName,
        driverFcmToken,
        planName,
        subscriptionType,
        endDate,
        daysSinceExpiry,
        price,
        autoRenew,
      } = payload;

      // Send email notification
      const subject = 'UrCab Subscription Expired - Action Required';
      const html = this.getSubscriptionExpiredEmailTemplate(
        driverName,
        planName,
        subscriptionType,
        endDate,
        daysSinceExpiry,
        price,
        autoRenew,
      );
      const text = `Hello ${driverName},\n\nYour subscription has expired.\n\nPlan: ${planName}\nType: ${subscriptionType}\nExpiry Date: ${endDate.toLocaleDateString()}\nDays Since Expiry: ${daysSinceExpiry}\nPrice: RM ${price}\nAuto Renew: ${autoRenew ? 'Yes' : 'No'}\n\nYour subscription status has been updated to expired. Please renew your subscription immediately to continue providing rides.\n\nIf you have any questions, please contact our support team.`;

      await this.emailNotificationService.sendEmail({
        to: driverEmail,
        subject,
        html,
        text,
      });

      // Send push notification if FCM token is available
      if (driverFcmToken) {
        try {
          const message: admin.messaging.Message = {
            token: driverFcmToken,
            notification: {
              title: '🚫 Subscription Expired',
              body: `Your ${planName} has expired. Please renew immediately to continue driving.`,
            },
            data: {
              type: 'subscription_expired',
              subscriptionId: payload.subscriptionId,
            },
            android: {
              priority: 'high',
              notification: {
                channelId: 'subscription_notifications',
                priority: 'high',
                defaultSound: true,
              },
            },
            apns: {
              payload: {
                aps: {
                  alert: {
                    title: '🚫 Subscription Expired',
                    body: `Your ${planName} has expired. Please renew immediately to continue driving.`,
                  },
                  sound: 'default',
                  badge: 1,
                },
              },
            },
          };
          await this.firebase.messaging.send(message);
        } catch (fcmError) {
          this.logger.warn(`Failed to send FCM notification to driver ${payload.driverId}:`, fcmError.message);
        }
      }

      this.logger.log(`Subscription expired notification sent to ${driverEmail} for subscription ${payload.subscriptionId}`);
    } catch (error) {
      this.logger.error(`Failed to send subscription expired notification to ${payload.driverEmail}`, error.stack);
    }
  }

  private getSubscriptionExpiringSoonEmailTemplate(
    driverName: string,
    planName: string,
    subscriptionType: string,
    endDate: Date,
    daysUntilExpiry: number,
    price: number,
    autoRenew: boolean,
  ): string {
    const expiryDateStr = endDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #F59E0B; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; }
          .warning-box { background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .info-box { background-color: #fff; border: 2px solid #4F46E5; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .info-row { margin: 10px 0; padding: 10px; background-color: #f3f4f6; border-radius: 4px; }
          .info-label { font-weight: bold; color: #4F46E5; display: inline-block; min-width: 150px; }
          .info-value { color: #333; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Subscription Expiring Soon</h1>
          </div>
          <div class="content">
            <p>Hello ${driverName},</p>
            <p>Your subscription is expiring soon. Please renew it before the expiry date to continue providing rides.</p>
            
            <div class="warning-box">
              <p><strong>⚠️ Important:</strong></p>
              <p>Your subscription will expire in <strong>${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}</strong>.</p>
            </div>

            <div class="info-box">
              <h3 style="margin-top: 0; color: #4F46E5;">Subscription Details</h3>
              <div class="info-row">
                <span class="info-label">Plan:</span>
                <span class="info-value">${planName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Type:</span>
                <span class="info-value">${subscriptionType}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Expiry Date:</span>
                <span class="info-value">${expiryDateStr}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Days Remaining:</span>
                <span class="info-value"><strong>${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}</strong></span>
              </div>
              <div class="info-row">
                <span class="info-label">Price:</span>
                <span class="info-value">RM ${price.toFixed(2)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Auto Renew:</span>
                <span class="info-value">${autoRenew ? 'Yes' : 'No'}</span>
              </div>
            </div>

            <p>To renew your subscription, please log in to your driver account and complete the renewal process.</p>
            <p>If you have any questions or need assistance, please contact our support team.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} UrCab. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getSubscriptionExpiredEmailTemplate(
    driverName: string,
    planName: string,
    subscriptionType: string,
    endDate: Date,
    daysSinceExpiry: number,
    price: number,
    autoRenew: boolean,
  ): string {
    const expiryDateStr = endDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #DC2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; }
          .error-box { background-color: #FEE2E2; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .info-box { background-color: #fff; border: 2px solid #DC2626; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .info-row { margin: 10px 0; padding: 10px; background-color: #f3f4f6; border-radius: 4px; }
          .info-label { font-weight: bold; color: #DC2626; display: inline-block; min-width: 150px; }
          .info-value { color: #333; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚫 Subscription Expired</h1>
          </div>
          <div class="content">
            <p>Hello ${driverName},</p>
            <p>Your subscription has expired. Your subscription status has been updated to expired.</p>
            
            <div class="error-box">
              <p><strong>🚫 Action Required:</strong></p>
              <p>Your subscription expired <strong>${daysSinceExpiry} day${daysSinceExpiry !== 1 ? 's' : ''} ago</strong>. You must renew your subscription immediately to continue providing rides.</p>
            </div>

            <div class="info-box">
              <h3 style="margin-top: 0; color: #DC2626;">Subscription Details</h3>
              <div class="info-row">
                <span class="info-label">Plan:</span>
                <span class="info-value">${planName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Type:</span>
                <span class="info-value">${subscriptionType}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Expiry Date:</span>
                <span class="info-value">${expiryDateStr}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Status:</span>
                <span class="info-value"><strong style="color: #DC2626;">EXPIRED</strong></span>
              </div>
              <div class="info-row">
                <span class="info-label">Price:</span>
                <span class="info-value">RM ${price.toFixed(2)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Auto Renew:</span>
                <span class="info-value">${autoRenew ? 'Yes' : 'No'}</span>
              </div>
            </div>

            <p><strong>Important:</strong> You cannot accept new ride requests until your subscription is renewed. Please log in to your driver account and complete the renewal process immediately.</p>
            <p>If you have any questions or need assistance, please contact our support team.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} UrCab. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
