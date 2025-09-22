import { Module } from '@nestjs/common';
import { FirebaseNotificationService } from './firebaseNotification.service';

@Module({
  imports: [],
  providers: [FirebaseNotificationService],
  exports: [FirebaseNotificationService],
})
export class NotificationsModule {}
