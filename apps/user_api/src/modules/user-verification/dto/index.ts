import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDate, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentStatus, DocumentType } from '@urcab-workspace/shared';
import { Types } from 'mongoose';

export class UserDocumentResponseDto {
  @ApiProperty()
  _id: Types.ObjectId;

  @ApiProperty()
  driverId: Types.ObjectId;

  @ApiProperty({ enum: DocumentType })
  documentType: DocumentType;

  @ApiProperty({ enum: DocumentStatus })
  status: DocumentStatus;

  @ApiProperty({ required: false })
  nricDetails?: {
    nricName: string;
    nricAddress: string;
    nricNumber: string;
    citizenship: string;
    frontImageUrl: string;
    backImageUrl: string;
  };

  @ApiProperty({ required: false })
  passportDetails?: {
    passportHolderName: string;
    passportNumber: string;
    issueDate: Date;
    expiryDate: Date;
    imageUrl: string;
  };

  @ApiProperty({ required: false })
  expiryDate?: Date;

  @ApiProperty({ required: false })
  verifiedByAdminId?: Types.ObjectId;

  @ApiProperty({ required: false })
  verifiedAt?: Date;

  @ApiProperty({ required: false })
  verificationNotes?: string;

  @ApiProperty({ required: false })
  rejectionReason?: string;

  @ApiProperty({ required: false })
  rejectedAt?: Date;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  uploadedAt: Date;

  @ApiProperty({ required: false })
  adminNotes?: string;

  @ApiProperty()
  version: number;

  @ApiProperty({ required: false })
  previousVersionId?: Types.ObjectId;

  @ApiProperty()
  isExpiringSoon: boolean;

  @ApiProperty({ required: false })
  expiryNotificationSentAt?: Date;

  // @ApiProperty()
  // createdAt: Date;

  // @ApiProperty()
  // updatedAt: Date;
}

export class DocumentStatusDto {
  @ApiProperty()
  exists: boolean;

  @ApiProperty({ enum: DocumentStatus, nullable: true })
  status: DocumentStatus | null;

  @ApiProperty({ nullable: true })
  uploadedAt: Date | null;

  @ApiProperty({ nullable: true })
  verifiedAt: Date | null;

  @ApiProperty()
  isExpiringSoon: boolean;

  @ApiProperty({ nullable: true })
  expiryDate: Date | null;
}

export class DocumentsStatusCountDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  pending: number;

  @ApiProperty()
  verified: number;

  @ApiProperty()
  rejected: number;
}

export class ExpiringDocumentDto {
  @ApiProperty()
  documentType: string;

  @ApiProperty()
  expiryDate: Date;
}

export class UserDocumentsSummaryDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  isFullyVerified: boolean;

  @ApiProperty()
  documentsStatus: DocumentsStatusCountDto;

  @ApiProperty()
  documents: {
    nric: DocumentStatusDto;
    passport: DocumentStatusDto;
  };

  @ApiProperty({ type: [ExpiringDocumentDto] })
  expiringDocuments: ExpiringDocumentDto[];

  @ApiProperty()
  lastUpdated: Date;
}
export class PassportDetailsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  passportHolderName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  passportNumber: string;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  issueDate: Date;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  expiryDate: Date;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  imageUrl: string;
}

export class NRICDetailsPassengerDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nricName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nricAddress: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  nricNumber: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  citizenship: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  frontImageUrl: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  backImageUrl: string;
}

export interface PassengerDocumentResponseDto {
  _id: string;
  driverId: string;
  documentType: string;
  status: string;
  nricDetails?: {
    nricName: string;
    nricAddress: string;
    nricNumber: string;
    citizenship: string;
    frontImageUrl: string;
    backImageUrl: string;
  };
  passportDetails?: {
    passportHolderName: string;
    passportNumber: string;
    issueDate: string;
    expiryDate: string;
    imageUrl: string;
  };
  expiryDate?: Date;
  verifiedByAdminId?: string;
  verifiedAt?: Date;
  verificationNotes?: string;
  rejectionReason?: string;
  rejectedAt?: Date;
  isActive: boolean;
  uploadedAt: Date;
  adminNotes?: string;
  version: number;
  previousVersionId?: string;
  isExpiringSoon?: boolean;
  expiryNotificationSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
