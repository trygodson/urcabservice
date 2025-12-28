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
} from '@urcab-workspace/shared';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [DriverSubscriptionsController],
  providers: [DriverSubscriptionsService, SubscriptionRepository, SubscriptionPlanRepository, UserRepository],
  exports: [DriverSubscriptionsService],
})
export class DriverSubscriptionsModule {}

