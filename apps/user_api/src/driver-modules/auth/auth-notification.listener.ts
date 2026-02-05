import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EmailNotificationService } from '@urcab-workspace/shared';
import { ConfigService } from '@nestjs/config';

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
    private readonly configService: ConfigService,
  ) {}

  @OnEvent('auth.user_registered', { async: true })
  async handleUserRegistered(payload: UserRegisteredPayload) {
    try {
      const { email, fullName, userType, verificationToken } = payload;

      // Send welcome email
      await this.emailNotificationService.sendWelcomeEmail(email, fullName, userType);

      // Send verification email if verification token is provided
      if (verificationToken) {
        const verificationUrl = this.getVerificationUrl(verificationToken);
        await this.emailNotificationService.sendOtpEmail(email, fullName, verificationToken, 'verification', 4);
      }

      this.logger.log(`Welcome and verification emails sent to ${email} for user ${payload.userId}`);
    } catch (error) {
      this.logger.error(`Failed to send registration emails to ${payload.email}`, error.stack);
    }
  }

  @OnEvent('auth.email_verification_requested', { async: true })
  async handleEmailVerificationRequested(payload: EmailVerificationPayload) {
    try {
      const { email, fullName, otpCode, verificationToken } = payload;

      // Send verification email with OTP
      if (verificationToken) {
        const verificationUrl = this.getVerificationUrl(verificationToken);
        await this.emailNotificationService.sendVerificationEmail(email, fullName, verificationToken, verificationUrl);
      }

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

      // Send password reset email with OTP
      const resetUrl = this.getPasswordResetUrl(otpCode);
      await this.emailNotificationService.sendPasswordResetEmail(email, fullName, otpCode, resetUrl);

      // Also send OTP via email
      const otpSubject = 'Your UrCab Password Reset Code';
      const otpHtml = this.getPasswordResetOtpTemplate(fullName, otpCode);
      const otpText = `Hello ${fullName},\n\nYour password reset code is: ${otpCode}\n\nThis code will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.`;

      await this.emailNotificationService.sendOtpEmail(email, fullName, otpCode, 'password_reset', 4);

      this.logger.log(`Password reset email sent to ${email} for user ${payload.userId}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${payload.email}`, error.stack);
    }
  }

  @OnEvent('auth.email_verified', { async: true })
  async handleEmailVerified(payload: { userId: string; email: string; fullName: string }) {
    try {
      const { email, fullName } = payload;

      const subject = 'Email Verified Successfully';
      const html = this.getEmailVerifiedTemplate(fullName);
      const text = `Hello ${fullName},\n\nYour email has been successfully verified. Welcome to UrCab!`;

      await this.emailNotificationService.sendEmail({
        to: email,
        subject,
        html,
        text,
      });

      this.logger.log(`Email verification confirmation sent to ${email} for user ${payload.userId}`);
    } catch (error) {
      this.logger.error(`Failed to send email verification confirmation to ${payload.email}`, error.stack);
    }
  }

  private getVerificationUrl(token: string): string {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://app.urcab.com';
    return `${frontendUrl}/verify-email?token=${token}`;
  }

  private getPasswordResetUrl(otp: string): string {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://app.urcab.com';
    return `${frontendUrl}/reset-password?otp=${otp}`;
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
