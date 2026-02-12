import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EmailNotificationService } from '@urcab-workspace/shared';

interface AdminUserCreatedPayload {
  userId: string;
  email: string;
  fullName: string;
  password: string;
  roleId: string;
  createdBy: string;
}

interface AdminPasswordResetPayload {
  userId: string;
  email: string;
  fullName: string;
  otpCode: string;
  expiryMinutes: number;
}

@Injectable()
export class AdminAuthNotificationListener {
  private readonly logger = new Logger(AdminAuthNotificationListener.name);

  constructor(private readonly emailNotificationService: EmailNotificationService) {}

  @OnEvent('admin.password_reset_requested', { async: true })
  async handleAdminPasswordResetRequested(payload: AdminPasswordResetPayload) {
    try {
      const { email, fullName, otpCode, expiryMinutes } = payload;

      // Send password reset OTP email
      await this.emailNotificationService.sendOtpEmail(email, fullName, otpCode, 'password_reset', expiryMinutes);

      this.logger.log(`Password reset OTP email sent to ${email} for user ${payload.userId}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset OTP email to ${payload.email}`, error.stack);
    }
  }
}
