import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '../database';
import { Types, SchemaTypes, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { VehicleDocumentStatus, VehicleDocumentType } from '../enums';
import { User } from './user.schema';

export interface CarInsuranceDetails {
  frontImageUrl: string;
  backImageUrl: string;
  insuranceExpiryDate: Date;
  policyType: string; // comprehensive, third_party, etc.
  provider: string;
  policyNumber?: string;
  coverageAmount?: number;
}

export interface CarRentalAgreementDetails {
  imageUrl: string;
  agreementNumber?: string;
  rentalCompany?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface PuspakomInspectionDetails {
  imageUrl: string;
  inspectionDate?: Date;
  inspectionType?: string;
  certificateNumber?: string;
  expiryDate?: Date;
}

export interface TaxiPermitVehicleDetails {
  imageUrl: string;
  issueDate: Date;
  expiryDate: Date;
  permitNumber?: string;
  issuingAuthority?: string;
}

export interface AuthorizationLetterDetails {
  imageUrl: string;
  ownerName?: string;
  ownerNric?: string;
  vehicleRegistrationNumber?: string;
  authorizedDriverName?: string;
  effectiveDate?: Date;
  expiryDate?: Date;
}

@Schema({ collection: 'vehicledocuments', timestamps: true })
export class VehicleDocumentRecord extends AbstractDocument {
  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'vehicle',
    required: true,
  })
  vehicleId: Types.ObjectId;

  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'user',
    required: true,
  })
  uploadedByDriverId: Types.ObjectId;

  @ApiProperty()
  @Prop({
    type: String,
    enum: VehicleDocumentType,
    required: true,
  })
  documentType: string;

  @ApiProperty()
  @Prop({
    type: String,
    enum: VehicleDocumentStatus,
    default: VehicleDocumentStatus.PENDING,
  })
  status: string;

  @ApiProperty()
  @Prop({
    type: {
      frontImageUrl: { type: String },
      backImageUrl: { type: String },
      insuranceExpiryDate: { type: Date },
      policyType: { type: String, enum: ['comprehensive', 'third_party', 'third_party_fire_theft'] },
      provider: { type: String },
      policyNumber: { type: String },
      coverageAmount: { type: Number },
    },
    // required: false,
  })
  carInsuranceDetails?: CarInsuranceDetails;

  @ApiProperty()
  @Prop({
    type: {
      imageUrl: { type: String },
      agreementNumber: { type: String },
      rentalCompany: { type: String },
      startDate: { type: Date },
      endDate: { type: Date },
    },
    // required: false,
  })
  carRentalAgreementDetails?: CarRentalAgreementDetails;

  @ApiProperty()
  @Prop({
    type: {
      imageUrl: { type: String },
      inspectionDate: { type: Date },
      inspectionType: { type: String },
      certificateNumber: { type: String },
      expiryDate: { type: Date },
    },
    // required: false,
  })
  puspakomInspectionDetails?: PuspakomInspectionDetails;

  @ApiProperty()
  @Prop({
    type: {
      imageUrl: { type: String },
      issueDate: { type: Date },
      expiryDate: { type: Date },
      permitNumber: { type: String },
      issuingAuthority: { type: String },
    },
    // required: false,
  })
  taxiPermitVehicleDetails?: TaxiPermitVehicleDetails;

  @ApiProperty()
  @Prop({
    type: {
      imageUrl: { type: String },
      ownerName: { type: String },
      ownerNric: { type: String },
      vehicleRegistrationNumber: { type: String },
      authorizedDriverName: { type: String },
      effectiveDate: { type: Date },
      expiryDate: { type: Date },
    },
    // required: false,
  })
  authorizationLetterDetails?: AuthorizationLetterDetails;

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  expiryDate?: Date; // General expiry date for the document

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
    type: Date,
    required: false,
  })
  rejectedAt?: Date;

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: true,
  })
  isActive: boolean;

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  uploadedAt?: Date;

  @ApiProperty()
  @Prop({
    type: String,
    required: false,
    maxlength: 300,
  })
  adminNotes?: string;

  @ApiProperty()
  @Prop({
    type: Number,
    default: 1,
  })
  version: number; // For tracking document versions

  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: VehicleDocumentRecord.name,
    required: false,
  })
  previousVersionId?: Types.ObjectId; // Reference to previous version

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: false,
  })
  isExpiringSoon: boolean; // Flag for documents expiring within 30 days

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  expiryNotificationSentAt?: Date;

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: false,
  })
  isRequired: boolean; // Whether this document is mandatory for the vehicle

  @ApiProperty()
  @Prop({
    type: String,
    required: false,
    maxlength: 200,
  })
  originalFileName?: string; // Original filename when uploaded
}

export const VehicleDocumentSchema = SchemaFactory.createForClass(VehicleDocumentRecord);
export type VehicleDocumentRecordDocument = VehicleDocumentRecord & Document;

// Indexes for performance
VehicleDocumentSchema.index({ vehicleId: 1 });
VehicleDocumentSchema.index({ vehicleId: 1, documentType: 1 });
VehicleDocumentSchema.index({ uploadedByDriverId: 1 });
VehicleDocumentSchema.index({ status: 1 });
VehicleDocumentSchema.index({ expiryDate: 1 });
VehicleDocumentSchema.index({ vehicleId: 1, status: 1 });
VehicleDocumentSchema.index({ documentType: 1, status: 1 });
VehicleDocumentSchema.index({ isExpiringSoon: 1 });
VehicleDocumentSchema.index({ vehicleId: 1, isActive: 1 });
VehicleDocumentSchema.index({ isRequired: 1, status: 1 });
