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

@Injectable()
export class AdminNotificationListener {
  private readonly logger = new Logger(AdminNotificationListener.name);

  constructor(private readonly emailNotificationService: EmailNotificationService) {}

  @OnEvent('admin.user_created', { async: true })
  async handleAdminUserCreated(payload: AdminUserCreatedPayload) {
    try {
      const { email, fullName, password, roleId } = payload;

      // Send admin credentials email
      await this.emailNotificationService.sendAdminCredentialsEmail(email, fullName, password, roleId);

      this.logger.log(`Admin credentials email sent to ${email} for user ${payload.userId}`);
    } catch (error) {
      this.logger.error(`Failed to send admin credentials email to ${payload.email}`, error.stack);
    }
  }
}
