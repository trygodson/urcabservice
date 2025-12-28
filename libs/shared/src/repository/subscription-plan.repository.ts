import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractRepository } from '../database';
import { SubscriptionPlan, SubscriptionPlanDocument } from '../models';
import { SubscriptionType } from '../enums';

@Injectable()
export class SubscriptionPlanRepository extends AbstractRepository<SubscriptionPlanDocument> {
  protected readonly logger = new Logger(SubscriptionPlanRepository.name);

  constructor(@InjectModel(SubscriptionPlan.name) subscriptionPlanModel: Model<SubscriptionPlanDocument>) {
    super(subscriptionPlanModel);
  }

  /**
   * Find active subscription plans
   */
  async findActivePlans(): Promise<SubscriptionPlanDocument[]> {
    return this.model.find({ isActive: true, status: 'active' }).sort({ type: 1 }).exec();
  }

  /**
   * Find subscription plan by type
   */
  async findByType(type: SubscriptionType): Promise<SubscriptionPlanDocument | null> {
    return this.model.findOne({ type, isActive: true, status: 'active' }).exec();
  }

  /**
   * Find subscription plan by ID
   */
  async findById(id: string): Promise<SubscriptionPlanDocument | null> {
    return this.model.findById(id).exec();
  }

  /**
   * Find all subscription plans (including inactive)
   */
  async findAll(): Promise<SubscriptionPlanDocument[]> {
    return this.model.find({ isActive: true }).sort({ type: 1 }).exec();
  }

  /**
   * Check if a plan type already exists
   */
  async planTypeExists(type: SubscriptionType, excludeId?: string): Promise<boolean> {
    const query: any = { type, isActive: true };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const count = await this.model.countDocuments(query).exec();
    return count > 0;
  }
}

