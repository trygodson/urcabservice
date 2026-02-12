import { Module } from '@nestjs/common';
import { DriverSubscriptionsService } from './driver-subscriptions.service';
import { DriverSubscriptionsController } from './driver-subscriptions.controller';
import {
  DatabaseModule,
  Subscription,
  SubscriptionSchema,
  SubscriptionRepository,
  SubscriptionPlan,
  SubscriptionPlanSchema,
  SubscriptionPlanRepository,
  User,
  UserSchema,
  UserRepository,
  NotificationsModule,
} from '@urcab-workspace/shared';
import { SubscriptionExpirationJob } from './subscription-expiration.job';
import { SubscriptionExpirationListener } from './subscription-expiration.listener';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
      { name: User.name, schema: UserSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [DriverSubscriptionsController],
  providers: [
    DriverSubscriptionsService,
    SubscriptionRepository,
    SubscriptionPlanRepository,
    UserRepository,
    SubscriptionExpirationJob,
    SubscriptionExpirationListener,
  ],
  exports: [DriverSubscriptionsService],
})
export class DriverSubscriptionsModule {}

