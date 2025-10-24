// src/common/src/decorators/subscription.decorator.ts
import { SetMetadata } from '@nestjs/common';

export enum SubscriptionTier {
  BASIC = 'BASIC',
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
}

export const REQUIRES_SUBSCRIPTION_KEY = 'requires_subscription';
export const SUBSCRIPTION_TIER_KEY = 'subscription_tier';

/**
 * Decorator to require any active subscription
 */
export const RequiresSubscription = () => SetMetadata(REQUIRES_SUBSCRIPTION_KEY, true);

/**
 * Decorator to require specific subscription tier
 */
export const RequiresTier = (tier: SubscriptionTier) => SetMetadata(SUBSCRIPTION_TIER_KEY, tier);

/**
 * Combined decorator for subscription and tier
 */
export const RequiresSubscriptionTier = (tier: SubscriptionTier) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    RequiresSubscription()(target, propertyKey, descriptor);
    RequiresTier(tier)(target, propertyKey, descriptor);
  };
};
