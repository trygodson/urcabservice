import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '../database';
import { Types, SchemaTypes, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { DocumentStatus, DocumentType, LicenseClass, LicenseType } from '../enums';

export interface NRICDetails {
  nricName: string;
  nricAddress: string;
  nricNumber: string;
  citizenship: string;
  frontImageUrl: string;
  backImageUrl: string;
}

export interface PassportDetails {
  passportHolderName: string;
  passportNumber: string;
  issueDate: Date;
  expiryDate: Date;
  imageUrl: string;
}

export interface PSVLicenseDetails {
  psvSerialNumber: string;
  ownPsv: boolean;
  psvExpiry: Date;
  frontImageUrl: string;
  backImageUrl: string;
}

export interface PamanduDetails {
  imageUrl: string;
  expiryDate: Date;
}

export interface DrivingLicenseDetails {
  licenseClass: string;
  licenseType: string;
  licenseNumber: string;
  expiryDate: Date;
  frontImageUrl: string;
  backImageUrl: string;
}

export interface TaxiPermitDriverDetails {
  imageUrl: string;
  issueDate: Date;
  expiryDate: Date;
}

@Schema({ collection: 'driverdocuments', timestamps: true })
export class DriverDocument extends AbstractDocument {
  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
  })
  driverId: Types.ObjectId;

  @ApiProperty()
  @Prop({
    type: String,
    enum: DocumentType,
    required: true,
  })
  documentType: string;

  @ApiProperty()
  @Prop({
    type: String,
    enum: DocumentStatus,
    default: DocumentStatus.PENDING,
  })
  status: string;

  @ApiProperty()
  @Prop({
    type: {
      nricName: { type: String },
      nricAddress: { type: String },
      nricNumber: { type: String },
      citizenship: { type: String },
      frontImageUrl: { type: String },
      backImageUrl: { type: String },
    },
  })
  nricDetails?: NRICDetails;

  @ApiProperty()
  @Prop({
    type: {
      passportHolderName: { type: String },
      passportNumber: { type: String },
      issueDate: { type: Date },
      expiryDate: { type: Date },
      imageUrl: { type: String },
    },
    // required: false,
  })
  passportDetails?: PassportDetails;

  @ApiProperty()
  @Prop({
    type: {
      psvSerialNumber: { type: String },
      ownPsv: { type: Boolean },
      psvExpiry: { type: Date },
      frontImageUrl: { type: String },
      backImageUrl: { type: String },
    },
    // required: false,
  })
  psvLicenseDetails?: PSVLicenseDetails;

  @ApiProperty()
  @Prop({
    type: {
      imageUrl: { type: String },
      expiryDate: { type: Date },
    },
    // required: false,
  })
  pamanduDetails?: PamanduDetails;

  @ApiProperty()
  @Prop({
    type: {
      licenseClass: { type: String, enum: LicenseClass },
      licenseType: { type: String, enum: LicenseType },
      licenseNumber: { type: String },
      expiryDate: { type: Date },
      frontImageUrl: { type: String },
      backImageUrl: { type: String },
    },
    // required: false,
  })
  drivingLicenseDetails?: DrivingLicenseDetails;

  @ApiProperty()
  @Prop({
    type: {
      imageUrl: { type: String },
      issueDate: { type: Date },
      expiryDate: { type: Date },
    },
    // required: false,
  })
  taxiPermitDriverDetails?: TaxiPermitDriverDetails;

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  expiryDate?: Date; // General expiry date for the document

  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
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
    ref: DriverDocument.name,
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
  @Prop({ required: false })
  lastUpdatedAt?: Date;
}

export const DriverDocumentSchema = SchemaFactory.createForClass(DriverDocument);
export type DriverDocumentDocument = DriverDocument & Document;

// Indexes for performance
DriverDocumentSchema.index({ driverId: 1 });
DriverDocumentSchema.index({ driverId: 1, documentType: 1 });
DriverDocumentSchema.index({ status: 1 });
DriverDocumentSchema.index({ expiryDate: 1 });
DriverDocumentSchema.index({ driverId: 1, status: 1 });
DriverDocumentSchema.index({ documentType: 1, status: 1 });
DriverDocumentSchema.index({ isExpiringSoon: 1 });
DriverDocumentSchema.index({ driverId: 1, isActive: 1 });
