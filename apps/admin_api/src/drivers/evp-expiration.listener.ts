import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EmailNotificationService } from '@urcab-workspace/shared';
import * as admin from 'firebase-admin';
import { FirebaseAdmin, InjectFirebaseAdmin } from 'nestjs-firebase';

interface EvpExpiringSoonPayload {
  evpId: string;
  vehicleId: string;
  driverId: string;
  driverEmail: string;
  driverName: string;
  driverFcmToken?: string;
  certificateNumber: string;
  endDate: Date;
  daysUntilExpiry: number;
  vehicleMake: string;
  vehicleModel: string;
  licensePlate: string;
}

interface EvpExpiredPayload {
  evpId: string;
  vehicleId: string;
  driverId: string;
  driverEmail: string;
  driverName: string;
  driverFcmToken?: string;
  certificateNumber: string;
  endDate: Date;
  daysSinceExpiry: number;
  vehicleMake: string;
  vehicleModel: string;
  licensePlate: string;
}

@Injectable()
export class EvpExpirationListener {
  private readonly logger = new Logger(EvpExpirationListener.name);

  constructor(
    private readonly emailNotificationService: EmailNotificationService,
    @InjectFirebaseAdmin() private readonly firebase: FirebaseAdmin,
  ) {}

  @OnEvent('evp.expiring_soon', { async: true })
  async handleEvpExpiringSoon(payload: EvpExpiringSoonPayload) {
    try {
      const {
        driverEmail,
        driverName,
        driverFcmToken,
        certificateNumber,
        endDate,
        daysUntilExpiry,
        vehicleMake,
        vehicleModel,
        licensePlate,
      } = payload;

      // Send email notification
      const subject = `UrCab EVP Expiring Soon - ${daysUntilExpiry} Days Remaining`;
      const html = this.getEvpExpiringSoonEmailTemplate(
        driverName,
        certificateNumber,
        endDate,
        daysUntilExpiry,
        vehicleMake,
        vehicleModel,
        licensePlate,
      );
      const text = `Hello ${driverName},\n\nYour Vehicle Electronic Verification Permit (EVP) is expiring soon.\n\nCertificate Number: ${certificateNumber}\nVehicle: ${vehicleMake} ${vehicleModel} (${licensePlate})\nExpiry Date: ${endDate.toLocaleDateString()}\nDays Remaining: ${daysUntilExpiry}\n\nPlease renew your EVP before it expires to continue providing rides.\n\nIf you have any questions, please contact our support team.`;

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
              title: '⚠️ EVP Expiring Soon',
              body: `Your EVP expires in ${daysUntilExpiry} days. Please renew to continue driving.`,
            },
            data: {
              type: 'evp_expiring_soon',
              evpId: payload.evpId,
              vehicleId: payload.vehicleId,
              daysUntilExpiry: daysUntilExpiry.toString(),
            },
            android: {
              priority: 'high',
              notification: {
                channelId: 'evp_notifications',
                priority: 'high',
                defaultSound: true,
              },
            },
            apns: {
              payload: {
                aps: {
                  alert: {
                    title: '⚠️ EVP Expiring Soon',
                    body: `Your EVP expires in ${daysUntilExpiry} days. Please renew to continue driving.`,
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

      this.logger.log(`EVP expiring soon notification sent to ${driverEmail} for EVP ${payload.evpId}`);
    } catch (error) {
      this.logger.error(`Failed to send EVP expiring soon notification to ${payload.driverEmail}`, error.stack);
    }
  }

  @OnEvent('evp.expired', { async: true })
  async handleEvpExpired(payload: EvpExpiredPayload) {
    try {
      const {
        driverEmail,
        driverName,
        driverFcmToken,
        certificateNumber,
        endDate,
        daysSinceExpiry,
        vehicleMake,
        vehicleModel,
        licensePlate,
      } = payload;

      // Send email notification
      const subject = 'UrCab EVP Expired - Action Required';
      const html = this.getEvpExpiredEmailTemplate(
        driverName,
        certificateNumber,
        endDate,
        daysSinceExpiry,
        vehicleMake,
        vehicleModel,
        licensePlate,
      );
      const text = `Hello ${driverName},\n\nYour Vehicle Electronic Verification Permit (EVP) has expired.\n\nCertificate Number: ${certificateNumber}\nVehicle: ${vehicleMake} ${vehicleModel} (${licensePlate})\nExpiry Date: ${endDate.toLocaleDateString()}\nDays Since Expiry: ${daysSinceExpiry}\n\nYour EVP status has been updated to expired. Please renew your EVP immediately to continue providing rides.\n\nIf you have any questions, please contact our support team.`;

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
              title: '🚫 EVP Expired',
              body: 'Your EVP has expired. Please renew immediately to continue driving.',
            },
            data: {
              type: 'evp_expired',
              evpId: payload.evpId,
              vehicleId: payload.vehicleId,
            },
            android: {
              priority: 'high',
              notification: {
                channelId: 'evp_notifications',
                priority: 'high',
                defaultSound: true,
              },
            },
            apns: {
              payload: {
                aps: {
                  alert: {
                    title: '🚫 EVP Expired',
                    body: 'Your EVP has expired. Please renew immediately to continue driving.',
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

      this.logger.log(`EVP expired notification sent to ${driverEmail} for EVP ${payload.evpId}`);
    } catch (error) {
      this.logger.error(`Failed to send EVP expired notification to ${payload.driverEmail}`, error.stack);
    }
  }

  private getEvpExpiringSoonEmailTemplate(
    driverName: string,
    certificateNumber: string,
    endDate: Date,
    daysUntilExpiry: number,
    vehicleMake: string,
    vehicleModel: string,
    licensePlate: string,
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
          .cta-button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ EVP Expiring Soon</h1>
          </div>
          <div class="content">
            <p>Hello ${driverName},</p>
            <p>Your Vehicle Electronic Verification Permit (EVP) is expiring soon. Please renew it before the expiry date to continue providing rides.</p>
            
            <div class="warning-box">
              <p><strong>⚠️ Important:</strong></p>
              <p>Your EVP will expire in <strong>${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}</strong>.</p>
            </div>

            <div class="info-box">
              <h3 style="margin-top: 0; color: #4F46E5;">EVP Details</h3>
              <div class="info-row">
                <span class="info-label">Certificate Number:</span>
                <span class="info-value">${certificateNumber}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Vehicle:</span>
                <span class="info-value">${vehicleMake} ${vehicleModel}</span>
              </div>
              <div class="info-row">
                <span class="info-label">License Plate:</span>
                <span class="info-value">${licensePlate}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Expiry Date:</span>
                <span class="info-value">${expiryDateStr}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Days Remaining:</span>
                <span class="info-value"><strong>${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}</strong></span>
              </div>
            </div>

            <p>To renew your EVP, please log in to your driver account and complete the renewal process.</p>
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

  private getEvpExpiredEmailTemplate(
    driverName: string,
    certificateNumber: string,
    endDate: Date,
    daysSinceExpiry: number,
    vehicleMake: string,
    vehicleModel: string,
    licensePlate: string,
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
          .cta-button { display: inline-block; padding: 12px 24px; background-color: #DC2626; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚫 EVP Expired</h1>
          </div>
          <div class="content">
            <p>Hello ${driverName},</p>
            <p>Your Vehicle Electronic Verification Permit (EVP) has expired. Your EVP status has been updated to expired.</p>
            
            <div class="error-box">
              <p><strong>🚫 Action Required:</strong></p>
              <p>Your EVP expired <strong>${daysSinceExpiry} day${daysSinceExpiry !== 1 ? 's' : ''} ago</strong>. You must renew your EVP immediately to continue providing rides.</p>
            </div>

            <div class="info-box">
              <h3 style="margin-top: 0; color: #DC2626;">EVP Details</h3>
              <div class="info-row">
                <span class="info-label">Certificate Number:</span>
                <span class="info-value">${certificateNumber}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Vehicle:</span>
                <span class="info-value">${vehicleMake} ${vehicleModel}</span>
              </div>
              <div class="info-row">
                <span class="info-label">License Plate:</span>
                <span class="info-value">${licensePlate}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Expiry Date:</span>
                <span class="info-value">${expiryDateStr}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Status:</span>
                <span class="info-value"><strong style="color: #DC2626;">EXPIRED</strong></span>
              </div>
            </div>

            <p><strong>Important:</strong> You cannot accept new ride requests until your EVP is renewed. Please log in to your driver account and complete the renewal process immediately.</p>
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
