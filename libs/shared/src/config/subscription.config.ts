// src/common/src/config/subscription.config.ts

import { SubscriptionTier } from '../decorators/subscription.decorator';

export interface SubscriptionPlan {
  name: string;
  monthly: number;
  weekly: number;
  // yearly: number;
  features: string[];
  description?: string;
}

export interface SubscriptionPlans {
  [key: string]: SubscriptionPlan;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlans = {
  [SubscriptionTier.BRONZE]: {
    name: 'Bronze',
    monthly: 10, // 10 FanzCoins per month
    weekly: 10, // 10 FanzCoins per month
    description: 'Perfect For Simple Riders',
    features: ['20 rides per week', 'Customer Care Support'],
  },
  [SubscriptionTier.SILVER]: {
    name: 'Silver',
    weekly: 25, // 25 FanzCoins per month
    monthly: 250, // 25 FanzCoins per month
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

export const getSubscriptionPrice = (tier: SubscriptionTier, billingCycle: 'weekly' | 'monthly'): number => {
  const plan = SUBSCRIPTION_PLANS[tier];
  if (!plan) return 0;
  return billingCycle === 'weekly' ? plan.weekly : plan.monthly;
};

export const getRequiredTierForPredictions = (): SubscriptionTier => {
  return SubscriptionTier.BRONZE;
};

export const getRequiredTierForAITickets = (): SubscriptionTier => {
  return SubscriptionTier.SILVER;
};
