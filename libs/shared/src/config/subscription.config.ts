// src/common/src/config/subscription.config.ts

import { SubscriptionTier } from '../decorators/subscription.decorator';

export interface SubscriptionPlan {
  name: string;
  price: number;
  // yearly: number;
  features: string[];
  description?: string;
}

export interface SubscriptionPlans {
  [key: string]: SubscriptionPlan;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlans = {
  [SubscriptionTier.DAILY]: {
    name: 'Daily',
    price: 100,
    description: 'Perfect For Simple Riders',
    features: ['20 rides per week', 'Customer Care Support'],
  },
  [SubscriptionTier.WEEKLY]: {
    name: 'Weekly',
    price: 250,
    description: 'For serious Serious Riders',
    features: ['Everything in Pro', 'Unlimited rides'],
  },
  [SubscriptionTier.MONTHLY]: {
    name: 'Monthly',
    price: 500,
    description: 'For serious Serious Riders',
    features: ['Everything in Pro', 'Unlimited rides'],
  },
};

export const TRIAL_PERIOD_DAYS = 7;

export const getSubscriptionPlan = (tier: SubscriptionTier): SubscriptionPlan | undefined => {
  return SUBSCRIPTION_PLANS[tier];
};

export const getAllSubscriptionPlans = (): SubscriptionPlans => {
  return SUBSCRIPTION_PLANS;
};

export const getSubscriptionPrice = (tier: SubscriptionTier, billingCycle: 'daily' | 'weekly' | 'monthly'): number => {
  const plan = SUBSCRIPTION_PLANS[tier];
  if (!plan) return 0;
  return plan.price;
};
