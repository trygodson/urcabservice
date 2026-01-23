import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { RideStatus } from '@urcab-workspace/shared/enums';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: string | Buffer;
    contentType?: string;
  }>;
}

export interface RideEmailData {
  rideId: string;
  passengerName?: string;
  driverName?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  estimatedFare?: number;
  finalFare?: number;
  status?: string;
  reason?: string;
}

@Injectable()
export class EmailNotificationService {
  private readonly logger = new Logger(EmailNotificationService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const smtpServer = this.configService.get<string>('SMTP_SERVER');
    const smtpPort = this.configService.get<number>('SMTP_PORT') || 587;
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPassword = this.configService.get<string>('SMTP_PASSWORD');

    if (!smtpPassword) {
      this.logger.warn('SMTP_PASSWORD not configured. Email notifications will not work.');
    }

    this.transporter = nodemailer.createTransport({
      host: smtpServer,
      port: smtpPort,
      secure: false, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
      // tls: {
      //   rejectUnauthorized: false, // For development, set to true in production with proper certificates
      // },
    });

    // Verify connection
    this.transporter.verify((error, success) => {
      if (error) {
        this.logger.error('SMTP connection verification failed:', error);
      } else {
        this.logger.log('SMTP server is ready to send emails');
      }
    });
  }

  /**
   * Send a generic email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (!this.transporter) {
        this.logger.error('SMTP transporter not initialized');
        return false;
      }

      const smtpFrom = this.configService.get<string>('SMTP_FROM') || this.configService.get<string>('SMTP_USER');
      const smtpFromName = this.configService.get<string>('SMTP_FROM_NAME') || 'UrCab Service';

      const mailOptions = {
        from: `"${smtpFromName}" <${smtpFrom}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : undefined,
        bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : undefined,
        attachments: options.attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Send ride status update email to passenger
   */

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(userEmail: string, userName: string, userType: 'passenger' | 'driver'): Promise<boolean> {
    try {
      const subject = 'Welcome to UrCab!';
      const html = this.getWelcomeEmailTemplate(userName, userType);
      const text = `Hello ${userName},\n\nWelcome to UrCab! We're excited to have you on board.\n\nThank you for joining us!`;

      return await this.sendEmail({
        to: userEmail,
        subject,
        html,
        text,
      });
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${userEmail}`, error.stack);
      return false;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    userEmail: string,
    userName: string,
    resetToken: string,
    resetUrl: string,
  ): Promise<boolean> {
    try {
      const subject = 'Reset Your UrCab Password';
      const html = this.getPasswordResetEmailTemplate(userName, resetToken, resetUrl);
      const text = `Hello ${userName},\n\nYou requested to reset your password. Click the link below to reset it:\n\n${resetUrl}\n\nIf you didn't request this, please ignore this email.\n\nThis link will expire in 1 hour.`;

      return await this.sendEmail({
        to: userEmail,
        subject,
        html,
        text,
      });
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${userEmail}`, error.stack);
      return false;
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(
    userEmail: string,
    userName: string,
    verificationToken: string,
    verificationUrl: string,
  ): Promise<boolean> {
    try {
      const subject = 'Verify Your UrCab Account';
      const html = this.getVerificationEmailTemplate(userName, verificationToken, verificationUrl);
      const text = `Hello ${userName},\n\nPlease verify your email address by clicking the link below:\n\n${verificationUrl}\n\nThank you for joining UrCab!`;

      return await this.sendEmail({
        to: userEmail,
        subject,
        html,
        text,
      });
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${userEmail}`, error.stack);
      return false;
    }
  }

  private getWelcomeEmailTemplate(userName: string, userType: 'passenger' | 'driver'): string {
    const roleText = userType === 'driver' ? 'driver' : 'passenger';
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
            <h1>Welcome to UrCab!</h1>
          </div>
          <div class="content">
            <p>Hello ${userName},</p>
            <p>Welcome to UrCab! We're excited to have you on board as a ${roleText}.</p>
            <p>Get started by completing your profile and exploring our services.</p>
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p>Thank you for joining us!</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} UrCab. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getPasswordResetEmailTemplate(userName: string, resetToken: string, resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; }
          .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
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
            <p>You requested to reset your password. Click the button below to reset it:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #4F46E5;">${resetUrl}</p>
            <p><strong>This link will expire in 1 hour.</strong></p>
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

  private getVerificationEmailTemplate(userName: string, verificationToken: string, verificationUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; }
          .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
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
            <p>Please verify your email address by clicking the button below:</p>
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #4F46E5;">${verificationUrl}</p>
            <p>Thank you for joining UrCab!</p>
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
