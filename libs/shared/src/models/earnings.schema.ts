import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '../database';
import { Types, SchemaTypes, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.schema';

export interface EarningsBreakdown {
  rideEarnings: number;
  bonusEarnings: number;
  totalEarnings: number;
  platformFee: number;
  netEarnings: number;
}

@Schema({ collection: 'earnings', timestamps: true })
export class Earnings extends AbstractDocument {
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
    ref: 'Ride',
    required: true,
  })
  rideId: Types.ObjectId;

  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Subscription',
    required: true,
  })
  subscriptionId: Types.ObjectId;

  @ApiProperty()
  @Prop({
    type: Number,
    required: true,
    min: 0,
  })
  fareAmount: number; // Total fare paid by passenger

  @ApiProperty()
  @Prop({
    type: Number,
    required: true,
    min: 0,
  })
  driverEarnings: number; // Amount driver receives

  @ApiProperty()
  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  platformFee: number; // Fee charged by platform (if any)

  @ApiProperty()
  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  bonusAmount: number; // Any bonus earnings (peak hours, promotions, etc.)

  @ApiProperty()
  @Prop({
    type: String,
    required: false,
    maxlength: 200,
  })
  bonusReason?: string; // Reason for bonus

  @ApiProperty()
  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  tipAmount: number; // Tips from passenger

  @ApiProperty()
  @Prop({
    type: Number,
    required: true,
    min: 0,
  })
  netEarnings: number; // Total amount driver receives (driverEarnings + bonusAmount + tipAmount)

  @ApiProperty()
  @Prop({
    type: Date,
    required: true,
  })
  earnedDate: Date; // Date when the earning was recorded

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  payoutDate?: Date; // Date when driver was paid (if applicable)

  @ApiProperty()
  @Prop({
    type: String,
    required: false,
    maxlength: 100,
  })
  payoutReference?: string; // Payment reference number

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: false,
  })
  isPaidOut: boolean; // Whether this earning has been paid to driver

  @ApiProperty()
  @Prop({
    type: Number,
    required: false,
    min: 0,
  })
  distance?: number; // Distance traveled for this ride (km)

  @ApiProperty()
  @Prop({
    type: Number,
    required: false,
    min: 0,
  })
  duration?: number; // Duration of ride (minutes)

  @ApiProperty()
  @Prop({
    type: String,
    required: false,
    maxlength: 50,
  })
  city?: string; // City where ride took place

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: false,
  })
  isPeakHours: boolean; // Whether ride was during peak hours

  @ApiProperty()
  @Prop({
    type: Number,
    default: 1,
    min: 1,
  })
  peakMultiplier: number; // Peak hour multiplier applied

  @ApiProperty()
  @Prop({
    type: String,
    required: false,
    maxlength: 300,
  })
  notes?: string; // Any additional notes about this earning

  @ApiProperty()
  @Prop({
    type: {
      rideEarnings: { type: Number },
      bonusEarnings: { type: Number },
      totalEarnings: { type: Number },
      platformFee: { type: Number },
      netEarnings: { type: Number },
    },
    required: false,
  })
  breakdown?: EarningsBreakdown;
}

export const EarningsSchema = SchemaFactory.createForClass(Earnings);
export type EarningsDocument = Earnings & Document;

// Indexes for performance
EarningsSchema.index({ driverId: 1 });
EarningsSchema.index({ driverId: 1, earnedDate: -1 });
EarningsSchema.index({ rideId: 1 });
EarningsSchema.index({ subscriptionId: 1 });
EarningsSchema.index({ driverId: 1, isPaidOut: 1 });
EarningsSchema.index({ earnedDate: -1 });
EarningsSchema.index({ city: 1, earnedDate: -1 });
EarningsSchema.index({ driverId: 1, earnedDate: 1, isPaidOut: 1 });
