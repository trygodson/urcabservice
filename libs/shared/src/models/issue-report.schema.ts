import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '../database';
import { Types, SchemaTypes, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IssueType, IssueStatus } from '../enums';
import { User } from './user.schema';
import { Ride } from './ride.schema';

@Schema({ collection: 'issuereports', timestamps: true })
export class IssueReport extends AbstractDocument {
  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
    required: true,
  })
  reporterId: Types.ObjectId; // Usually passenger, but could be driver

  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: Ride.name,
    required: true,
  })
  rideId: Types.ObjectId;

  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
    required: false,
  })
  reportedUserId?: Types.ObjectId; // The user being reported (usually driver)

  @ApiProperty()
  @Prop({
    type: String,
    enum: IssueType,
    required: true,
  })
  issueType: string;

  @ApiProperty()
  @Prop({
    type: String,
    required: true,
    maxlength: 1000,
  })
  description: string;

  @ApiProperty()
  @Prop({
    type: String,
    enum: IssueStatus,
    default: IssueStatus.OPEN,
  })
  status: string;

  @ApiProperty()
  @Prop({
    type: Number,
    min: 1,
    max: 5,
    required: false,
  })
  severityLevel?: number; // 1 = Low, 5 = Critical

  @ApiProperty()
  @Prop({
    type: [String],
    default: [],
  })
  attachments?: string[]; // URLs to uploaded images/files

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  incidentTime?: Date;

  @ApiProperty()
  @Prop({
    type: {
      latitude: { type: Number },
      longitude: { type: Number },
      address: { type: String },
    },
    required: false,
  })
  incidentLocation?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };

  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
    required: false,
  })
  assignedToAdminId?: Types.ObjectId;

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  assignedAt?: Date;

  @ApiProperty()
  @Prop({
    type: String,
    required: false,
    maxlength: 1000,
  })
  adminNotes?: string;

  @ApiProperty()
  @Prop({
    type: String,
    required: false,
    maxlength: 1000,
  })
  resolutionDetails?: string;

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  resolvedAt?: Date;

  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
    required: false,
  })
  resolvedByAdminId?: Types.ObjectId;

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: false,
  })
  requiresFollowUp: boolean;

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  followUpDate?: Date;

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: false,
  })
  isAnonymous: boolean; // Whether the report should be anonymous to the reported user
}

export const IssueReportSchema = SchemaFactory.createForClass(IssueReport);
export type IssueReportDocument = IssueReport & Document;

// Indexes for performance
IssueReportSchema.index({ reporterId: 1 });
IssueReportSchema.index({ rideId: 1 });
IssueReportSchema.index({ reportedUserId: 1 });
IssueReportSchema.index({ status: 1 });
IssueReportSchema.index({ issueType: 1 });
IssueReportSchema.index({ assignedToAdminId: 1 });
IssueReportSchema.index({ createdAt: -1 });
IssueReportSchema.index({ severityLevel: -1 });
