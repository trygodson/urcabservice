import { Module } from '@nestjs/common';
import { SubscriptionPlansService } from './subscription-plans.service';
import { SubscriptionPlansController } from './subscription-plans.controller';
import {
  DatabaseModule,
  SubscriptionPlan,
  SubscriptionPlanSchema,
  SubscriptionPlanRepository,
} from '@urcab-workspace/shared';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
    ]),
  ],
  controllers: [SubscriptionPlansController],
  providers: [SubscriptionPlansService, SubscriptionPlanRepository],
  exports: [SubscriptionPlansService],
})
export class SubscriptionPlansModule {}

