import { Module } from '@nestjs/common';
import { FirebaseNotificationService } from './firebaseNotification.service';
import { FirebaseModule } from 'nestjs-firebase';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [],
  providers: [FirebaseNotificationService],
  exports: [FirebaseNotificationService],
})
export class NotificationsModule {}
