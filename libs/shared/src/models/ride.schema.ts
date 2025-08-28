import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '../database';
import { Types, SchemaTypes, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { RideStatus, RideType, PaymentMethod, PaymentStatus } from '../enums';
import { User } from './user.schema';

interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
  address: string;
  placeId?: string;
  landmark?: string;
}

export interface PriceBreakdown {
  basePrice: number;
  distancePrice: number;
  timePrice: number;
  totalPrice: number;
}

@Schema({ collection: 'rides', timestamps: true })
export class Ride extends AbstractDocument {
  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
    required: true,
  })
  passengerId: Types.ObjectId;

  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
    required: false,
  })
  driverId?: Types.ObjectId;

  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
    required: false,
  })
  selectedDriverId?: Types.ObjectId;

  @ApiProperty()
  @Prop({
    type: String,
    enum: RideStatus,
    default: RideStatus.SEARCHING_DRIVER,
    required: true,
  })
  status: string;

  @ApiProperty()
  @Prop({
    type: String,
    enum: RideType,
    required: true,
  })
  rideType: string;

  @ApiProperty()
  @Prop({
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number] }, // [longitude, latitude]
    address: { type: String },
    placeId: { type: String },
  })
  pickupLocation: GeoJSONPoint;

  @ApiProperty()
  @Prop({
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number] }, // [longitude, latitude]
    address: { type: String },
    placeId: { type: String },
  })
  dropoffLocation: GeoJSONPoint;

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  scheduledTime?: Date;

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  driverAssignedAt?: Date;

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  startedAt?: Date;

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  completedAt?: Date;

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
  cancelledBy?: Types.ObjectId;

  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
    required: false,
  })
  rejectedBy?: Types.ObjectId;

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  rejectedAt?: Date;

  @ApiProperty()
  @Prop({
    type: String,
    required: false,
  })
  cancelReason?: string;

  @ApiProperty()
  @Prop({
    type: String,
    required: false,
  })
  cancellationReason?: string;

  @ApiProperty()
  @Prop({
    type: Number,
    required: false,
  })
  estimatedDistance?: number; // in kilometers

  @ApiProperty()
  @Prop({
    type: Number,
    required: false,
  })
  actualDistance?: number; // in kilometers

  @ApiProperty()
  @Prop({
    type: Number,
    required: false,
  })
  estimatedDuration?: number; // in minutes

  @ApiProperty()
  @Prop({
    type: Number,
    required: false,
  })
  actualDuration?: number; // in minutes

  @ApiProperty()
  @Prop({
    type: Number,
    required: false,
  })
  estimatedFare?: number; // in RM

  @ApiProperty()
  @Prop({
    type: Number,
    required: false,
  })
  finalFare?: number; // in RM

  @ApiProperty()
  @Prop({
    type: {
      basePrice: { type: Number },
      distancePrice: { type: Number },
      timePrice: { type: Number },
      totalPrice: { type: Number },
    },
    required: false,
  })
  priceBreakdown?: PriceBreakdown;

  @ApiProperty()
  @Prop({
    type: String,
    enum: PaymentMethod,
    default: PaymentMethod.CASH,
  })
  paymentMethod: string;

  @ApiProperty()
  @Prop({
    type: String,
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: string;

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  paymentConfirmedAt?: Date;

  @ApiProperty()
  @Prop({
    type: String,
    required: false,
    maxlength: 500,
  })
  specialRequests?: string;

  @ApiProperty()
  @Prop({
    type: Number,
    min: 1,
    max: 4,
    default: 1,
  })
  passengerCount: number;

  @ApiProperty()
  @Prop({
    type: [String],
    default: [],
  })
  route?: string[]; // Array of coordinates representing the actual route taken

  @ApiProperty()
  @Prop({
    type: String,
    required: false,
  })
  notes?: string; // Internal notes for admin/driver
}

export const RideSchema = SchemaFactory.createForClass(Ride);
export type RideDocument = Ride & Document;

// Create 2dsphere index for geospatial queries
RideSchema.index({ pickupLocation: '2dsphere' });
RideSchema.index({ dropoffLocation: '2dsphere' });

// Other indexes for performance
RideSchema.index({ passengerId: 1 });
RideSchema.index({ driverId: 1 });
RideSchema.index({ status: 1 });
RideSchema.index({ rideType: 1 });
RideSchema.index({ createdAt: -1 });
RideSchema.index({ scheduledTime: 1 });
RideSchema.index({ paymentStatus: 1 });
RideSchema.index({ cancelledBy: 1 });

// Compound indexes for common queries
RideSchema.index({ passengerId: 1, status: 1 });
RideSchema.index({ driverId: 1, status: 1 });
RideSchema.index({ status: 1, createdAt: -1 });
RideSchema.index({ rideType: 1, scheduledTime: 1 });
