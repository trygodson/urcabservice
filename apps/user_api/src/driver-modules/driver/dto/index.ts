import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsUrl,
  ValidateNested,
  Length,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentType, LicenseClass, LicenseType } from '@urcab-workspace/shared';

export class NRICDetailsDto {
  @ApiProperty({ description: 'Full name as shown on NRIC' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  nricName: string;

  @ApiProperty({ description: 'Address as shown on NRIC' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 200)
  nricAddress: string;

  @ApiProperty({ description: 'NRIC number' })
  @IsString()
  @IsNotEmpty()
  @Length(12, 12)
  nricNumber: string;

  @ApiProperty({ description: 'Citizenship status' })
  @IsString()
  @IsNotEmpty()
  citizenship: string;

  @ApiProperty({ description: 'URL to front image of NRIC' })
  @IsUrl()
  frontImageUrl: string;

  @ApiProperty({ description: 'URL to back image of NRIC' })
  @IsUrl()
  backImageUrl: string;
}

export class PassportDetailsDto {
  @ApiProperty({ description: 'Full name as shown on passport' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  passportHolderName: string;

  @ApiProperty({ description: 'Passport number' })
  @IsString()
  @IsNotEmpty()
  passportNumber: string;

  @ApiProperty({ description: 'Passport issue date' })
  @IsDateString()
  issueDate: string;

  @ApiProperty({ description: 'Passport expiry date' })
  @IsDateString()
  expiryDate: string;

  @ApiProperty({ description: 'URL to passport image' })
  @IsUrl()
  imageUrl: string;
}

export class PSVLicenseDetailsDto {
  @ApiProperty({ description: 'PSV serial number' })
  @IsString()
  @IsNotEmpty()
  psvSerialNumber: string;

  @ApiProperty({ description: 'Whether driver owns the PSV' })
  @IsBoolean()
  ownPsv: boolean;

  @ApiProperty({ description: 'PSV expiry date' })
  @IsDateString()
  psvExpiry: string;

  @ApiProperty({ description: 'URL to front image of PSV license' })
  @IsUrl()
  frontImageUrl: string;

  @ApiProperty({ description: 'URL to back image of PSV license' })
  @IsUrl()
  backImageUrl: string;
}

export class PamanduDetailsDto {
  @ApiProperty({ description: 'URL to Pamandu certificate image' })
  @IsUrl()
  imageUrl: string;

  @ApiProperty({ description: 'Pamandu certificate expiry date' })
  @IsDateString()
  expiryDate: string;
}

export class DrivingLicenseDetailsDto {
  @ApiProperty({ enum: LicenseClass, description: 'Driving license class' })
  @IsEnum(LicenseClass)
  licenseClass: LicenseClass;

  @ApiProperty({ enum: LicenseType, description: 'Driving license type' })
  @IsEnum(LicenseType)
  licenseType: LicenseType;

  @ApiProperty({ description: 'Driving license number' })
  @IsString()
  @IsNotEmpty()
  licenseNumber: string;

  @ApiProperty({ description: 'License expiry date' })
  @IsDateString()
  expiryDate: string;

  @ApiProperty({ description: 'URL to front image of driving license' })
  @IsUrl()
  frontImageUrl: string;

  @ApiProperty({ description: 'URL to back image of driving license' })
  @IsUrl()
  backImageUrl: string;
}

export class TaxiPermitDriverDetailsDto {
  @ApiProperty({ description: 'URL to taxi permit image' })
  @IsUrl()
  imageUrl: string;

  @ApiProperty({ description: 'Taxi permit issue date' })
  @IsDateString()
  issueDate: string;

  @ApiProperty({ description: 'Taxi permit expiry date' })
  @IsDateString()
  expiryDate: string;
}

export class CreateDriverDocumentDto {
  @ApiProperty({ enum: DocumentType, description: 'Type of document being uploaded' })
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @ApiPropertyOptional({ type: NRICDetailsDto, description: 'NRIC details (required for NRIC document type)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => NRICDetailsDto)
  nricDetails?: NRICDetailsDto;

  @ApiPropertyOptional({
    type: PassportDetailsDto,
    description: 'Passport details (required for PASSPORT document type)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PassportDetailsDto)
  passportDetails?: PassportDetailsDto;

  @ApiPropertyOptional({
    type: PSVLicenseDetailsDto,
    description: 'PSV license details (required for PSV_LICENSE document type)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PSVLicenseDetailsDto)
  psvLicenseDetails?: PSVLicenseDetailsDto;

  @ApiPropertyOptional({ type: PamanduDetailsDto, description: 'Pamandu details (required for PAMANDU document type)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => PamanduDetailsDto)
  pamanduDetails?: PamanduDetailsDto;

  @ApiPropertyOptional({
    type: DrivingLicenseDetailsDto,
    description: 'Driving license details (required for DRIVING_LICENSE document type)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DrivingLicenseDetailsDto)
  drivingLicenseDetails?: DrivingLicenseDetailsDto;

  @ApiPropertyOptional({
    type: TaxiPermitDriverDetailsDto,
    description: 'Taxi permit details (required for TAXI_PERMIT_DRIVER document type)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TaxiPermitDriverDetailsDto)
  taxiPermitDriverDetails?: TaxiPermitDriverDetailsDto;

  @ApiPropertyOptional({ description: 'General expiry date for the document' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

export class UpdateDriverDocumentDto {
  @ApiPropertyOptional({ type: NRICDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NRICDetailsDto)
  nricDetails?: NRICDetailsDto;

  @ApiPropertyOptional({ type: PassportDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PassportDetailsDto)
  passportDetails?: PassportDetailsDto;

  @ApiPropertyOptional({ type: PSVLicenseDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PSVLicenseDetailsDto)
  psvLicenseDetails?: PSVLicenseDetailsDto;

  @ApiPropertyOptional({ type: PamanduDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PamanduDetailsDto)
  pamanduDetails?: PamanduDetailsDto;

  @ApiPropertyOptional({ type: DrivingLicenseDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DrivingLicenseDetailsDto)
  drivingLicenseDetails?: DrivingLicenseDetailsDto;

  @ApiPropertyOptional({ type: TaxiPermitDriverDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TaxiPermitDriverDetailsDto)
  taxiPermitDriverDetails?: TaxiPermitDriverDetailsDto;

  @ApiPropertyOptional({ description: 'General expiry date for the document' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

export class DriverDocumentResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  driverId: string;

  @ApiProperty({ enum: DocumentType })
  documentType: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional({ type: NRICDetailsDto })
  nricDetails?: NRICDetailsDto;

  @ApiPropertyOptional({ type: PassportDetailsDto })
  passportDetails?: PassportDetailsDto;

  @ApiPropertyOptional({ type: PSVLicenseDetailsDto })
  psvLicenseDetails?: PSVLicenseDetailsDto;

  @ApiPropertyOptional({ type: PamanduDetailsDto })
  pamanduDetails?: PamanduDetailsDto;

  @ApiPropertyOptional({ type: DrivingLicenseDetailsDto })
  drivingLicenseDetails?: DrivingLicenseDetailsDto;

  @ApiPropertyOptional({ type: TaxiPermitDriverDetailsDto })
  taxiPermitDriverDetails?: TaxiPermitDriverDetailsDto;

  @ApiPropertyOptional()
  expiryDate?: Date;

  @ApiPropertyOptional()
  verifiedByAdminId?: string;

  @ApiPropertyOptional()
  verifiedAt?: Date;

  @ApiPropertyOptional()
  verificationNotes?: string;

  @ApiPropertyOptional()
  rejectionReason?: string;

  @ApiPropertyOptional()
  rejectedAt?: Date;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  uploadedAt?: Date;

  @ApiPropertyOptional()
  adminNotes?: string;

  @ApiProperty()
  version: number;

  @ApiPropertyOptional()
  previousVersionId?: string;

  @ApiProperty()
  isExpiringSoon: boolean;

  @ApiPropertyOptional()
  expiryNotificationSentAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class DocumentVerificationStatusDto {
  @ApiProperty({ enum: DocumentType })
  documentType: DocumentType;

  @ApiProperty({ description: 'Whether this document type has been uploaded' })
  isUploaded: boolean;

  @ApiProperty({ description: 'Document verification status' })
  status: string;

  @ApiPropertyOptional({ description: 'Document expiry date if applicable' })
  expiryDate?: Date;

  @ApiProperty({ description: 'Whether document is expiring soon (within 30 days)' })
  isExpiringSoon: boolean;

  @ApiPropertyOptional({ description: 'Rejection reason if document was rejected' })
  rejectionReason?: string;

  @ApiProperty({ description: 'Date when document was uploaded' })
  uploadedAt?: Date;

  @ApiProperty({ description: 'Date when document was verified' })
  verifiedAt?: Date;
}

export class DriverDocumentsSummaryDto {
  @ApiProperty({ description: 'Driver ID' })
  driverId: string;

  @ApiProperty({ type: [DocumentVerificationStatusDto], description: 'Status of each document type' })
  documents: DocumentVerificationStatusDto[];

  @ApiProperty({ description: 'Whether all required documents are uploaded and verified' })
  hasCompleteDocumentation: boolean;

  @ApiProperty({ description: 'Overall verification status' })
  overallStatus: 'pending' | 'verified' | 'rejected' | 'incomplete';

  @ApiProperty({ description: 'Number of documents uploaded' })
  uploadedCount: number;

  @ApiProperty({ description: 'Number of documents verified' })
  verifiedCount: number;

  @ApiProperty({ description: 'Number of documents rejected' })
  rejectedCount: number;

  @ApiProperty({ description: 'Total number of required documents' })
  requiredCount: number;

  @ApiProperty({ description: 'Documents that are expiring soon' })
  expiringSoonCount: number;

  // @ApiProperty({ description: 'Last update timestamp' })
  // lastUpdated: Date;
}
