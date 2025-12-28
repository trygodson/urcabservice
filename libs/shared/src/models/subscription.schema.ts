import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '../database';
import { Types, SchemaTypes, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionType, SubscriptionStatus } from '../enums';
import { User } from './user.schema';
import { SubscriptionPlan } from './subscription-plan.schema';

@Schema({ collection: 'subscriptions', timestamps: true })
export class Subscription extends AbstractDocument {
  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
    required: true,
  })
  driverId: Types.ObjectId;

  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: SubscriptionPlan.name,
    required: false,
  })
  planId?: Types.ObjectId; // Reference to the subscription plan

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
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status: string;

  @ApiProperty()
  @Prop({
    type: Date,
    required: true,
  })
  startDate: Date;

  @ApiProperty()
  @Prop({
    type: Date,
    required: true,
  })
  endDate: Date;

  @ApiProperty()
  @Prop({
    type: Number,
    required: true,
    min: 0,
  })
  price: number; // Price at the time of subscription creation (captured from plan)

  @ApiProperty()
  @Prop({
    type: String,
    required: false,
    maxlength: 100,
  })
  paymentMethod?: string; // e.g., 'cash', 'bank_transfer', 'mobile_money'

  @ApiProperty()
  @Prop({
    type: String,
    required: false,
    maxlength: 100,
  })
  paymentReference?: string; // Transaction reference

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  paymentDate?: Date;

  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
    required: false,
  })
  approvedByAdminId?: Types.ObjectId;

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  approvedAt?: Date;

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: true,
  })
  autoRenew: boolean;

  @ApiProperty()
  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  ridesCompleted: number; // Number of rides completed during this subscription period

  @ApiProperty()
  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  totalEarnings: number; // Total earnings during this subscription period

  @ApiProperty()
  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  dailyRideRequests: number; // Number of ride requests today (for free plan limit)

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  lastRideRequestDate?: Date; // Last date ride requests were tracked (for resetting daily count)

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  lastActiveDate?: Date; // Last date driver was online

  @ApiProperty()
  @Prop({
    type: String,
    required: false,
    maxlength: 500,
  })
  notes?: string; // Admin notes or special conditions

  @ApiProperty()
  @Prop({
    type: String,
    required: false,
    maxlength: 300,
  })
  cancellationReason?: string;

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  cancelledAt?: Date;

  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
    required: false,
  })
  cancelledByAdminId?: Types.ObjectId;

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: false,
  })
  isGracePeriod: boolean; // If subscription has expired but still in grace period

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  gracePeriodEndDate?: Date;

  @ApiProperty()
  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  discountPercentage?: number; // Any discount applied

  @ApiProperty()
  @Prop({
    type: String,
    required: false,
    maxlength: 200,
  })
  discountReason?: string; // Reason for discount (promo code, loyalty, etc.)

  createdAt?: Date;
  updatedAt?: Date;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
export type SubscriptionDocument = Subscription & Document;

// Indexes for performance
SubscriptionSchema.index({ driverId: 1 });
SubscriptionSchema.index({ driverId: 1, status: 1 });
SubscriptionSchema.index({ status: 1 });
SubscriptionSchema.index({ endDate: 1 });
SubscriptionSchema.index({ startDate: 1, endDate: 1 });
SubscriptionSchema.index({ driverId: 1, startDate: -1 });
SubscriptionSchema.index({ gracePeriodEndDate: 1 });
SubscriptionSchema.index({ type: 1, status: 1 });
