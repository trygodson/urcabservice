import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '../database';
import { Types, SchemaTypes, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { DocumentStatus, DocumentType } from '../enums';
import { User } from './user.schema';

interface NRICDetails {
  nricName: string;
  nricAddress: string;
  nricNumber: string;
  citizenship: string;
  frontImageUrl: string;
  backImageUrl: string;
}

interface PassportDetails {
  passportHolderName: string;
  passportNumber: string;
  issueDate: Date;
  expiryDate: Date;
  imageUrl: string;
}

@Schema({ collection: 'passengerdocuments', timestamps: true })
export class PassengerDocument extends AbstractDocument {
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
    ref: PassengerDocument.name,
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

export const PassengerDocumentSchema = SchemaFactory.createForClass(PassengerDocument);
export type PassengerDocumentDocument = PassengerDocument & Document;

// Indexes for performance
PassengerDocumentSchema.index({ driverId: 1 });
PassengerDocumentSchema.index({ driverId: 1, documentType: 1 });
PassengerDocumentSchema.index({ status: 1 });
PassengerDocumentSchema.index({ expiryDate: 1 });
PassengerDocumentSchema.index({ driverId: 1, status: 1 });
PassengerDocumentSchema.index({ documentType: 1, status: 1 });
PassengerDocumentSchema.index({ isExpiringSoon: 1 });
PassengerDocumentSchema.index({ driverId: 1, isActive: 1 });
