import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '../database';
import { SchemaTypes, Types, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.schema';

@Schema({ collection: 'vehicleType', timestamps: true })
export class VehicleType extends AbstractDocument {
  @ApiProperty()
  @Prop({
    type: String,
    required: true,
    unique: true,
  })
  name?: string; // The vehicle type name from the enum

  @ApiProperty()
  @Prop({
    type: String,
    maxlength: 255,
  })
  description?: string; // Optional description of the vehicle type

  @ApiProperty()
  @Prop({
    type: Number,
    required: true,
    min: 0,
  })
  pricePerKM?: number; // Price per kilometer for this vehicle type

  @ApiProperty()
  @Prop({
    type: Number,
    required: true,
    min: 0,
  })
  capacity?: number; // Passenger capacity for this vehicle type

  @ApiProperty()
  @Prop({
    type: String,
    maxlength: 255,
  })
  iconUrl?: string; // URL for vehicle type icon

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: true,
  })
  isActive?: boolean; // Whether this vehicle type is active in the system

  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
    required: false,
  })
  createdBy?: Types.ObjectId; // Stores ObjectId referencing User who created this entry

  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
    required: false,
  })
  updatedBy?: Types.ObjectId; // Stores ObjectId referencing User who last updated this entry
}

export const VehicleTypeSchema = SchemaFactory.createForClass(VehicleType);
export type VehicleTypeDocument = VehicleType & Document;
