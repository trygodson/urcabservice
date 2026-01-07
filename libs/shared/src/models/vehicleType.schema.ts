import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '../database';
import { SchemaTypes, Types, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.schema';

// Define pricing period structure
class PricingPeriod {
  @ApiProperty()
  @Prop({ required: true })
  name: string; // e.g., "Day Rate", "Night Rate", "Evening Rate"

  @ApiProperty()
  @Prop({ required: true })
  startTime: string; // Format: "HH:MM" e.g., "09:00"

  @ApiProperty()
  @Prop({ required: true })
  endTime: string; // Format: "HH:MM" e.g., "17:00"

  @ApiProperty()
  @Prop({ required: true, min: 0 })
  baseFare: number; // Base fare for initial distance (e.g., 3RM for 0-2km)

  @ApiProperty()
  @Prop({ required: true, min: 0 })
  baseDistance: number; // Distance covered by base fare in km (e.g., 2km)

  @ApiProperty()
  @Prop({ required: true, min: 0 })
  incrementalRate: number; // Additional fare per increment (e.g., 0.25RM)

  @ApiProperty()
  @Prop({ required: true, min: 0 })
  incrementalDistance: number; // Increment distance in km (e.g., 1km or 0.2km)

  @ApiProperty()
  @Prop({ required: true, min: 0 })
  longDistance: number; // Long distance in km (e.g., 1km or 0.2km)

  @ApiProperty()
  @Prop({ required: true, min: 0 })
  longDistanceSurcharge: number; // Long distance surcharge (e.g., 1RM or 0.2RM)
}

@Schema({ collection: 'vehicleType', timestamps: true })
export class VehicleType extends AbstractDocument {
  @ApiProperty()
  @Prop({
    type: String,
    required: true,
    unique: true,
  })
  name?: string; // The vehicle type name

  @ApiProperty()
  @Prop({
    type: String,
    maxlength: 255,
  })
  description?: string;

  @ApiProperty()
  @Prop({ type: [PricingPeriod], required: true })
  pricingPeriods?: PricingPeriod[]; // Array of pricing periods

  @ApiProperty()
  @Prop({
    type: Number,
    required: true,
    min: 0,
  })
  capacity?: number;

  @ApiProperty()
  @Prop({
    type: String,
    maxlength: 255,
  })
  iconUrl?: string;

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: true,
  })
  isActive?: boolean;

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

export const VehicleTypeSchema = SchemaFactory.createForClass(VehicleType);
export type VehicleTypeDocument = VehicleType & Document;
