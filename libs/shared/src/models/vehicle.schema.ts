import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '../database';
import { Types, SchemaTypes, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { VehicleStatus, VehicleBodyType, VehicleOwnership, VehicleAssemblyInfo, InsuredNameType, DriveCity } from '../enums';
import { User } from './user.schema';
import { VehicleType } from './vehicleType.schema';

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
    required: false,
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
    required: false,
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
    required: false,
    min: 2,
    max: 8,
  })
  seatingCapacity: number;

  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: VehicleType.name,
    required: true,
  })
  vehicleTypeId?: Types.ObjectId; // e.g., 'sedan', 'suv', 'hatchback'

  @ApiProperty()
  @Prop({
    type: String,
    required: true,
  })
  backPhoto?: string; // URLs to vehicle photos
  @ApiProperty()
  @Prop({
    type: String,
    required: true,
  })
  frontPhoto?: string; // URLs to vehicle photos
  @ApiProperty()
  @Prop({
    type: String,
    required: true,
  })
  leftPhoto?: string; // URLs to vehicle photos

  @ApiProperty()
  @Prop({
    type: String,
    required: true,
  })
  rightPhoto?: string; // URLs to vehicle photos

  @ApiProperty()
  @Prop({
    type: String,
    required: true,
  })
  frontRearPhoto?: string; // URLs to vehicle photos
  @ApiProperty()
  @Prop({
    type: String,
    required: true,
  })
  backRearPhoto?: string; // URLs to vehicle photos

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

  @ApiProperty()
  @Prop({
    type: Number,
    required: false,
    min: 0,
  })
  evpPrice?: number; // EVP price set by admin after all documents are approved

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: false,
  })
  evpPriceSet?: boolean; // Whether admin has set the EVP price

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: false,
  })
  evpAdminGeneratedPending?: boolean; // Whether EVP admin generated is pending

  @ApiProperty()
  @Prop({
    type: Number,
    required: false,
    min: 1,
  })
  evpPeriod?: number; // EVP validity period in days

  @ApiProperty()
  @Prop({ type: String, required: false, enum: VehicleBodyType })
  bodyType?: string;

  @ApiProperty()
  @Prop({ type: String, required: false, enum: VehicleOwnership })
  vehicleOwnership?: string;

  @ApiProperty()
  @Prop({ type: String, required: false, enum: VehicleAssemblyInfo })
  assemblyInfo?: string;

  @ApiProperty()
  @Prop({ type: Date, required: false })
  registeredDate?: Date;

  @ApiProperty()
  @Prop({ type: String, required: false, enum: InsuredNameType })
  insuredName?: string;

  @ApiProperty()
  @Prop({ type: String, required: false })
  authorizationLetterImageUrl?: string;

  @ApiProperty()
  @Prop({ type: String, required: false, enum: DriveCity })
  driveCity?: string;

  createdAt: Date;
  updatedAt: Date;
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
