// import { Role } from '../users/entity/users.entity';
import { DateTime } from 'luxon';
import { User } from '../models';
import { NotificationType } from '../enums';
export interface TokenPayLoad {
  user_id: number;
  email: string;
}

// export abstract class AbstractScheduler {
//   public abstract name: string;

//   public abstract timeExpression: string;

//   public abstract run();
// }
export interface SendPush {
  user: User;
  title: string;
  body: string;
  type?: NotificationType;
}
export interface SendManyPush {
  user: User[];
  title: string;
  body: string;
  type?: NotificationType;
}
export interface SavePushNotification {
  user: User;
  title: string;
  body: string;
  type: NotificationType;
}
export interface SavePushNotificationManyUsers {
  user: User[];
  title: string;
  body: string;
  type: NotificationType;
}

export interface CronJobConfig {
  name: string; // Unique name for the cron job
  cronExpression: string | Date;
  // Cron expression for scheduling
  callback: () => void; // Function to be executed
}
