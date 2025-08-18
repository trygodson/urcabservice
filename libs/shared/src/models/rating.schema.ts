import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '../database';
import { Types, SchemaTypes, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.schema';
import { Ride } from './ride.schema';

@Schema({ collection: 'ratings', timestamps: true })
export class Rating extends AbstractDocument {
  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
    required: true,
  })
  raterId: Types.ObjectId; // user giving the rating

  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
    required: true,
  })
  ratedUserId: Types.ObjectId; // User being rated

  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: Ride.name,
    required: true,
  })
  rideId: Types.ObjectId;

  @ApiProperty()
  @Prop({
    type: Number,
    required: true,
    min: 1,
    max: 5,
  })
  overallRating: number;

  @ApiProperty()
  @Prop({
    type: Number,
    required: false,
    min: 1,
    max: 5,
  })
  punctualityRating?: number;

  @ApiProperty()
  @Prop({
    type: Number,
    required: false,
    min: 1,
    max: 5,
  })
  communicationRating?: number;

  @ApiProperty()
  @Prop({
    type: Number,
    required: false,
    min: 1,
    max: 5,
  })
  vehicleConditionRating?: number;

  @ApiProperty()
  @Prop({
    type: Number,
    required: false,
    min: 1,
    max: 5,
  })
  drivingSkillRating?: number;

  @ApiProperty()
  @Prop({
    type: Number,
    required: false,
    min: 1,
    max: 5,
  })
  professionalismRating?: number;

  @ApiProperty()
  @Prop({
    type: String,
    required: false,
    maxlength: 500,
  })
  comment?: string;

  @ApiProperty()
  @Prop({
    type: [String],
    default: [],
  })
  tags?: string[]; // e.g., ['friendly', 'helpful', 'clean_car', 'safe_driving']

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: false,
  })
  isPublic: boolean; // Whether this rating can be shown publicly

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: false,
  })
  isFlagged: boolean; // If the rating was flagged for review

  @ApiProperty()
  @Prop({
    type: String,
    required: false,
    maxlength: 200,
  })
  flagReason?: string;

  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
    required: false,
  })
  flaggedByAdminId?: Types.ObjectId;

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  flaggedAt?: Date;

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: false,
  })
  isVerified: boolean; // Admin verified the rating is legitimate

  @ApiProperty()
  @Prop({
    type: String,
    required: false,
    maxlength: 300,
  })
  driverResponse?: string; // Driver's response to passenger rating

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  driverResponseAt?: Date;
}

export const RatingSchema = SchemaFactory.createForClass(Rating);
export type RatingDocument = Rating & Document;

// Indexes for performance
RatingSchema.index({ raterId: 1 });
RatingSchema.index({ ratedUserId: 1 });
RatingSchema.index({ rideId: 1 });
RatingSchema.index({ ratedUserId: 1, overallRating: -1 });
RatingSchema.index({ ratedUserId: 1, createdAt: -1 });
RatingSchema.index({ isPublic: 1, isFlagged: 1 });
RatingSchema.index({ isVerified: 1 });
