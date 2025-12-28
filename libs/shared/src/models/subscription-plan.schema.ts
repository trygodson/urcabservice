import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '../database';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionType } from '../enums';

@Schema({ collection: 'subscription_plans', timestamps: true })
export class SubscriptionPlan extends AbstractDocument {
  @ApiProperty()
  @Prop({
    type: String,
    required: true,
    maxlength: 100,
  })
  name: string; // e.g., "Daily Plan", "Weekly Plan", "Monthly Plan"

  @ApiProperty()
  @Prop({
    type: Number,
    required: true,
    min: 0,
  })
  price: number; // Current price of the plan

  @ApiProperty()
  @Prop({
    type: String,
    required: false,
    maxlength: 500,
  })
  description?: string; // Description of what the plan includes

  @ApiProperty()
  @Prop({
    type: Number,
    required: true,
    min: 1,
  })
  validity: number; // Number of days the subscription is valid (1 for daily, 7 for weekly, 30 for monthly)

  @ApiProperty()
  @Prop({
    type: String,
    enum: SubscriptionType,
    required: true,
  })
  type: string; // daily, weekly, or monthly

  @ApiProperty()
  @Prop({
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  })
  status: string; // Whether the plan is currently active or inactive

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: true,
  })
  isActive: boolean; // Soft delete flag
}

export const SubscriptionPlanSchema = SchemaFactory.createForClass(SubscriptionPlan);
export type SubscriptionPlanDocument = SubscriptionPlan & Document;

// Indexes for performance
SubscriptionPlanSchema.index({ type: 1 });
SubscriptionPlanSchema.index({ status: 1 });
SubscriptionPlanSchema.index({ isActive: 1 });
SubscriptionPlanSchema.index({ type: 1, status: 1 });

