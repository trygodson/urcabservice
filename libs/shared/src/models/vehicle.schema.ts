import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '../database';
import { Types, SchemaTypes, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { VehicleStatus } from '../enums';
import { User } from './user.schema';

@Schema({ collection: 'vehicle', timestamps: true })
export class Vehicle extends AbstractDocument {
  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
    required: true,
  })
  driverId: Types.ObjectId;

  @ApiProperty()
  @Prop({
    type: String,
    required: true,
    maxlength: 50,
  })
  name: string; // e.g., Toyota, Honda

  @ApiProperty()
  @Prop({
    type: String,
    required: true,
    maxlength: 50,
  })
  make: string; // e.g., Toyota, Honda

  @ApiProperty()
  @Prop({
    type: String,
    required: true,
    maxlength: 50,
  })
  model: string; // e.g., Camry, Civic

  @ApiProperty()
  @Prop({
    type: Number,
    required: true,
    min: 1950,
  })
  year: number;

  @ApiProperty()
  @Prop({
    type: String,
    required: true,
    maxlength: 50,
  })
  color: string;

  @ApiProperty()
  @Prop({
    type: String,
    required: true,
    unique: true,
    maxlength: 20,
  })
  licensePlate: string;

  @ApiProperty()
  @Prop({
    type: String,
    required: true,
    unique: true,
    maxlength: 50,
  })
  vin: string; // Vehicle Identification Number

  @ApiProperty()
  @Prop({
    type: String,
    enum: VehicleStatus,
    default: VehicleStatus.PENDING_VERIFICATION,
  })
  status: string;

  @ApiProperty()
  @Prop({
    type: Number,
    required: true,
    min: 2,
    max: 8,
  })
  seatingCapacity: number;

  @ApiProperty()
  @Prop({
    type: String,
    required: false,
    maxlength: 50,
  })
  vehicleType?: string; // e.g., 'sedan', 'suv', 'hatchback'

  @ApiProperty()
  @Prop({
    type: [String],
    default: [],
  })
  photos?: string[]; // URLs to vehicle photos

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  lastInspectionDate?: Date;

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  nextInspectionDue?: Date;

  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
    required: false,
  })
  verifiedByAdminId?: Types.ObjectId;

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  verifiedAt?: Date;

  @ApiProperty()
  @Prop({
    type: String,
    required: false,
    maxlength: 500,
  })
  verificationNotes?: string;

  @ApiProperty()
  @Prop({
    type: String,
    required: false,
    maxlength: 500,
  })
  rejectionReason?: string;

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: true,
  })
  isActive: boolean;

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: false,
  })
  isPrimary: boolean; // Driver's primary vehicle

  @ApiProperty()
  @Prop({
    type: Number,
    required: false,
    min: 0,
  })
  odometer?: number; // Current mileage

  @ApiProperty()
  @Prop({
    type: [String],
    default: [],
  })
  features?: string[]; // e.g., ['air_conditioning', 'gps', 'bluetooth', 'child_seats']

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: false,
  })
  hasCompleteDocumentation: boolean; // Computed field based on related VehicleDocuments

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  lastDocumentVerificationCheck?: Date; // Last time document status was verified
}

export const VehicleSchema = SchemaFactory.createForClass(Vehicle);
export type VehicleDocument = Vehicle & Document;

// Indexes for performance
VehicleSchema.index({ driverId: 1 });
VehicleSchema.index({ licensePlate: 1 });
VehicleSchema.index({ vin: 1 });
VehicleSchema.index({ status: 1 });
VehicleSchema.index({ driverId: 1, isPrimary: 1 });
VehicleSchema.index({ driverId: 1, isActive: 1 });
VehicleSchema.index({ hasCompleteDocumentation: 1 });
VehicleSchema.index({ lastDocumentVerificationCheck: 1 });
