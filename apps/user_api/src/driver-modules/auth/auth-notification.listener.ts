import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  EmailNotificationService,
  FirebaseNotificationService,
  UserRepository,
  NotificationRepository,
  Role,
  NotificationType,
  NotificationStatus,
  NotificationPriority,
} from '@urcab-workspace/shared';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';

interface UserRegisteredPayload {
  userId: string;
  email: string;
  fullName: string;
  userType: 'driver' | 'passenger';
  verificationToken?: string;
}

interface EmailVerificationPayload {
  userId: string;
  email: string;
  fullName: string;
  otpCode: string;
  verificationToken?: string;
}

interface PasswordResetPayload {
  userId: string;
  email: string;
  fullName: string;
  otpCode: string;
}

@Injectable()
export class AuthNotificationListener {
  private readonly logger = new Logger(AuthNotificationListener.name);

  constructor(
    private readonly emailNotificationService: EmailNotificationService,
    private readonly firebaseNotificationService: FirebaseNotificationService,
    private readonly userRepository: UserRepository,
    private readonly notificationRepository: NotificationRepository,
    private readonly configService: ConfigService,
  ) {}

  @OnEvent('auth.user_registered', { async: true })
  async handleUserRegistered(payload: UserRegisteredPayload) {
    try {
      const { email, fullName, userType, verificationToken } = payload;

      // Send welcome email
      await this.emailNotificationService.sendWelcomeEmail(email, fullName, userType);

      // Send verification email if verification token is provided

      await this.emailNotificationService.sendOtpEmail(email, fullName, verificationToken, 'verification', 4);

      this.logger.log(`Welcome and verification emails sent to ${email} for user ${payload.userId}`);
    } catch (error) {
      this.logger.error(`Failed to send registration emails to ${payload.email}`, error.stack);
    }
  }
  @OnEvent('auth.user_welcome', { async: true })
  async handleUserGoogleWelcome(payload: UserRegisteredPayload) {
    try {
      const { email, fullName, userType } = payload;

      // Send welcome email
      await this.emailNotificationService.sendWelcomeEmail(email, fullName, userType);
      
      this.logger.log(`Welcome email sent to ${email} for user ${payload.userId}`);
    } catch (error) {
      this.logger.error(`Failed to send registration emails to ${payload.email}`, error.stack);
    }
  }

  @OnEvent('auth.email_verification_requested', { async: true })
  async handleEmailVerificationRequested(payload: EmailVerificationPayload) {
    try {
      const { email, fullName, otpCode, verificationToken } = payload;

      // Send verification email with OTP
      // if (verificationToken) {
      //   const verificationUrl = this.getVerificationUrl(verificationToken);
      //   await this.emailNotificationService.sendVerificationEmail(email, fullName, verificationToken, verificationUrl);
      // }

      // Also send OTP via email (you might want to create a separate method for OTP emails)
      const otpSubject = 'Your UrCab Verification Code';
      const otpHtml = this.getOtpEmailTemplate(fullName, otpCode);
      const otpText = `Hello ${fullName},\n\nYour verification code is: ${otpCode}\n\nThis code will expire in 10 minutes.`;

      await this.emailNotificationService.sendEmail({
        to: email,
        subject: otpSubject,
        html: otpHtml,
        text: otpText,
      });

      this.logger.log(`Verification email sent to ${email} for user ${payload.userId}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${payload.email}`, error.stack);
    }
  }

  @OnEvent('auth.password_reset_requested', { async: true })
  async handlePasswordResetRequested(payload: PasswordResetPayload) {
    try {
      const { email, fullName, otpCode } = payload;

      await this.emailNotificationService.sendOtpEmail(email, fullName, otpCode, 'password_reset', 4);

      this.logger.log(`Password reset email sent to ${email} for user ${payload.userId}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${payload.email}`, error.stack);
    }
  }

  @OnEvent('auth.email_verified', { async: true })
  async handleEmailVerified(payload: { userId: string; email: string; fullName: string }) {
    try {
      const { email, fullName, userId } = payload;

      const subject = 'Email Verified Successfully';
      const html = this.getEmailVerifiedTemplate(fullName);
      const text = `Hello ${fullName},\n\nYour email has been successfully verified. Welcome to UrCab!`;

      await this.emailNotificationService.sendEmail({
        to: email,
        subject,
        html,
        text,
      });

      this.logger.log(`Email verification confirmation sent to ${email} for user ${userId}`);

      // Send push notification to super admin
      await this.notifySuperAdminAboutDriverVerification(userId, email, fullName);
    } catch (error) {
      this.logger.error(`Failed to send email verification confirmation to ${payload.email}`, error.stack);
    }
  }

  /**
   * Notify super admin when a driver successfully verifies their OTP
   */
  private async notifySuperAdminAboutDriverVerification(
    driverId: string,
    driverEmail: string,
    driverFullName: string,
  ): Promise<void> {
    try {
      // Find super admin user
      const superAdmin = await this.userRepository.findOne({
        type: Role.SUPER_ADMIN,
        isActive: true,
      });

      if (!superAdmin) {
        this.logger.warn('Super admin not found, skipping notification');
        return;
      }

      if (!superAdmin.fcmToken) {
        this.logger.warn('Super admin does not have FCM token, skipping push notification');
        return;
      }

      const title = '🚗 New Driver Verified';
      const message = `Driver ${driverFullName} (${driverEmail}) has successfully verified their email and is ready for onboarding.`;

      // Send push notification
      const pushNotificationId = await this.firebaseNotificationService.sendPushNotification(
        superAdmin.fcmToken,
        title,
        message,
        {
          type: 'driver_verified',
          driverId: driverId,
          driverEmail: driverEmail,
          driverName: driverFullName,
        },
        'high',
      );

      // Create notification record in database
      const notificationData: any = {
        userId: new Types.ObjectId(superAdmin._id),
        type: 'driver_verified', // Custom type for driver verification
        title,
        message,
        status: pushNotificationId ? NotificationStatus.SENT : NotificationStatus.FAILED,
        priority: NotificationPriority.HIGH,
        relatedEntityId: new Types.ObjectId(driverId),
        relatedEntityType: 'driver',
        data: {
          driverId,
          driverEmail,
          driverName: driverFullName,
        },
        isPushSent: !!pushNotificationId,
        isSystem: true,
        sentAt: new Date(),
      };

      if (pushNotificationId) {
        notificationData.pushNotificationId = pushNotificationId;
      }

      await this.notificationRepository.create(notificationData);

      this.logger.log(`Super admin notified about driver verification: ${driverId}`);
    } catch (error) {
      this.logger.error(`Failed to notify super admin about driver verification`, error.stack);
    }
  }

  private getVerificationUrl(token: string): string {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://app.urcab.com';
    return `${frontendUrl}/verify-email?token=${token}`;
  }

  private getOtpEmailTemplate(userName: string, otpCode: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; }
          .otp-box { background-color: #fff; border: 2px solid #4F46E5; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
          .otp-code { font-size: 32px; font-weight: bold; color: #4F46E5; letter-spacing: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify Your Email</h1>
          </div>
          <div class="content">
            <p>Hello ${userName},</p>
            <p>Your verification code is:</p>
            <div class="otp-box">
              <div class="otp-code">${otpCode}</div>
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} UrCab. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getPasswordResetOtpTemplate(userName: string, otpCode: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; }
          .otp-box { background-color: #fff; border: 2px solid #4F46E5; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
          .otp-code { font-size: 32px; font-weight: bold; color: #4F46E5; letter-spacing: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Reset Your Password</h1>
          </div>
          <div class="content">
            <p>Hello ${userName},</p>
            <p>You requested to reset your password. Your reset code is:</p>
            <div class="otp-box">
              <div class="otp-code">${otpCode}</div>
            </div>
            <p><strong>This code will expire in 1 hour.</strong></p>
            <p>If you didn't request this, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} UrCab. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getEmailVerifiedTemplate(userName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Email Verified Successfully</h1>
          </div>
          <div class="content">
            <p>Hello ${userName},</p>
            <p>Your email has been successfully verified. Welcome to UrCab!</p>
            <p>You can now start using all the features of our platform.</p>
            <p>If you have any questions, feel free to reach out to our support team.</p>
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
