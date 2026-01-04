import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FirebaseNotificationService } from './firebaseNotification.service';
import { EmailNotificationService } from './emailNotification.service';

@Module({
  imports: [ConfigModule],
  providers: [FirebaseNotificationService, EmailNotificationService],
  exports: [FirebaseNotificationService, EmailNotificationService],
})
export class NotificationsModule {}
