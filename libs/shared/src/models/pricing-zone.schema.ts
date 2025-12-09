import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '../database';
import { SchemaTypes, Types, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.schema';

@Schema({ collection: 'pricingZones', timestamps: true })
export class PricingZone extends AbstractDocument {
  @ApiProperty()
  @Prop({
    type: String,
    required: true,
    unique: true,
  })
  name: string;

  @ApiProperty()
  @Prop({
    type: String,
    required: true,
  })
  description: string;

  @ApiProperty()
  @Prop({
    type: Number,
    required: true,
    default: 1.0,
    min: 0.5,
    max: 3.0,
  })
  priceMultiplier: number;

  @ApiProperty({ description: 'Center point longitude of the zone' })
  @Prop({
    type: Number,
    required: true,
  })
  centerLongitude: number;

  @ApiProperty({ description: 'Center point latitude of the zone' })
  @Prop({
    type: Number,
    required: true,
  })
  centerLatitude: number;

  @ApiProperty({ description: 'Radius of the zone in kilometers' })
  @Prop({
    type: Number,
    required: true,
    min: 0.1,
    max: 50, // Maximum 50km radius
  })
  radiusKm: number;

  @ApiProperty({ description: 'Location as a GeoJSON point (for MongoDB spatial indexing)' })
  @Prop({
    type: Object,
    required: true,
  })
  location: {
    type: string; // 'Point'
    coordinates: number[]; // [longitude, latitude]
  };

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: true,
  })
  isActive: boolean;

  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
    required: false,
  })
  createdBy?: Types.ObjectId;

  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
    required: false,
  })
  updatedBy?: Types.ObjectId;
}

export const PricingZoneSchema = SchemaFactory.createForClass(PricingZone);

// Add geospatial index for efficient querying
PricingZoneSchema.index({ location: '2dsphere' });

export type PricingZoneDocument = PricingZone & Document;
