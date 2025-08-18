import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '../database';
import { Types, SchemaTypes, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { DriverOnlineStatus } from '../enums';
import { User } from './user.schema';
import { Ride } from './ride.schema';

interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}
@Schema({ collection: 'driverlocation', timestamps: true })
export class DriverLocation extends AbstractDocument {
  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
    required: true,
    unique: true, // One location record per driver
  })
  driverId: Types.ObjectId;

  @ApiProperty()
  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      // [longitude, latitude]
    },
    coordinates: {
      type: [Number],
      // required: true,
      validate: {
        validator: function (v: number[]) {
          return (
            v.length === 2 &&
            v[0] >= -180 &&
            v[0] <= 180 && // longitude
            v[1] >= -90 &&
            v[1] <= 90
          ); // latitude
        },
        message: 'Location coordinates must be [longitude, latitude] with valid ranges',
      },
    },
  })
  // location: GeoJSONPoint;
  location: {
    type: string;
    coordinates: number[];
  };

  @ApiProperty()
  @Prop({
    type: String,
    enum: DriverOnlineStatus,
    default: DriverOnlineStatus.OFFLINE,
  })
  status: string;

  @ApiProperty()
  @Prop({
    type: Number,
    required: false,
    min: 0,
    max: 360,
  })
  heading?: number; // Direction the driver is facing (0-360 degrees)

  @ApiProperty()
  @Prop({
    type: Number,
    required: false,
    min: 0,
  })
  speed?: number; // Speed in km/h

  @ApiProperty()
  @Prop({
    type: Number,
    required: false,
    min: 0,
  })
  accuracy?: number; // GPS accuracy in meters

  @ApiProperty()
  @Prop({
    type: Date,
    default: Date.now,
  })
  lastLocationUpdate: Date;

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  lastStatusChange?: Date;

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: false,
  })
  isAvailableForRides: boolean;

  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: Ride.name,
    // required: false,
  })
  currentRideId?: Types.ObjectId; // If driver is currently on a ride

  @ApiProperty()
  @Prop({
    type: String,
  })
  address?: string; // Reverse geocoded address for display
}

export const DriverLocationSchema = SchemaFactory.createForClass(DriverLocation);
export type DriverLocationDocument = DriverLocation & Document;

// Create geospatial index for location-based queries
DriverLocationSchema.index({ location: '2dsphere' });

// Additional indexes for performance
DriverLocationSchema.index({ driverId: 1 });
DriverLocationSchema.index({ status: 1 });
DriverLocationSchema.index({ isAvailableForRides: 1 });
DriverLocationSchema.index({ lastLocationUpdate: 1 });
DriverLocationSchema.index({ status: 1, isAvailableForRides: 1 });
DriverLocationSchema.index({ driverId: 1, status: 1 });

// Compound index for finding available drivers
DriverLocationSchema.index({
  status: 1,
  isAvailableForRides: 1,
  location: '2dsphere',
});
