import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsDateString,
  IsUrl,
  IsNumber,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  ValidateNested,
  Length,
  Min,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VehicleDocumentType } from '@urcab-workspace/shared';

export class CarInsuranceDetailsDto {
  @ApiProperty({ description: 'Front image URL of insurance document' })
  @IsUrl()
  frontImageUrl: string;

  @ApiProperty({ description: 'Back image URL of insurance document' })
  @IsUrl()
  backImageUrl: string;

  @ApiProperty({ description: 'Insurance expiry date' })
  @IsDateString()
  insuranceExpiryDate: string;

  @ApiPropertyOptional({
    description: 'Policy type',
    enum: ['comprehensive', 'third_party', 'third_party_fire_theft'],
  })
  // @IsOptional()
  @IsEnum(['comprehensive', 'third_party', 'third_party_fire_theft'])
  policyType: string;

  @ApiProperty({ description: 'Insurance provider name' })
  @IsString()
  @IsNotEmpty()
  provider: string;

  @ApiPropertyOptional({ description: 'Policy number' })
  @IsOptional()
  @IsString()
  policyNumber?: string;

  @ApiPropertyOptional({ description: 'Coverage amount in MYR' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  coverageAmount?: number;
}

export class CarRentalAgreementDetailsDto {
  @ApiProperty({ description: 'Rental agreement document image URL' })
  @IsUrl()
  imageUrl: string;

  @ApiPropertyOptional({ description: 'Agreement number' })
  @IsOptional()
  @IsString()
  agreementNumber?: string;

  @ApiPropertyOptional({ description: 'Rental company name' })
  @IsOptional()
  @IsString()
  rentalCompany?: string;

  @ApiPropertyOptional({ description: 'Rental start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Rental end date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class PuspakomInspectionDetailsDto {
  @ApiProperty({ description: 'Puspakom inspection certificate image URL' })
  @IsUrl()
  imageUrl: string;

  @ApiPropertyOptional({ description: 'Payment status (yes=true, no=false)' })
  @IsOptional()
  @IsBoolean()
  paymentStatus?: boolean;

  @ApiPropertyOptional({ description: 'Inspection date' })
  @IsOptional()
  @IsDateString()
  inspectionDate?: string;

  @ApiPropertyOptional({ description: 'Type of inspection' })
  @IsOptional()
  @IsString()
  inspectionType?: string;

  @ApiPropertyOptional({ description: 'Certificate number' })
  @IsOptional()
  @IsString()
  certificateNumber?: string;

  @ApiPropertyOptional({ description: 'Certificate expiry date' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

export class TaxiPermitVehicleDetailsDto {
  @ApiProperty({ description: 'Taxi permit document image URL' })
  @IsUrl()
  imageUrl: string;

  @ApiProperty({ description: 'Permit issue date' })
  @IsDateString()
  issueDate: string;

  @ApiProperty({ description: 'Permit expiry date' })
  @IsDateString()
  expiryDate: string;

  @ApiPropertyOptional({ description: 'Permit number' })
  @IsOptional()
  @IsString()
  permitNumber?: string;

  @ApiPropertyOptional({ description: 'Issuing authority' })
  @IsOptional()
  @IsString()
  issuingAuthority?: string;
}

export class AuthorizationLetterDetailsDto {
  @ApiProperty({ description: 'Authorization letter image URL' })
  @IsUrl()
  imageUrl: string;

  @ApiPropertyOptional({ description: 'Vehicle owner name' })
  @IsOptional()
  @IsString()
  ownerName?: string;

  @ApiPropertyOptional({ description: 'Owner NRIC number' })
  @IsOptional()
  @IsString()
  @Length(12, 12)
  ownerNric?: string;

  @ApiPropertyOptional({ description: 'Vehicle registration number' })
  @IsOptional()
  @IsString()
  vehicleRegistrationNumber?: string;

  @ApiPropertyOptional({ description: 'Authorized driver name' })
  @IsOptional()
  @IsString()
  authorizedDriverName?: string;

  @ApiPropertyOptional({ description: 'Authorization effective date' })
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @ApiPropertyOptional({ description: 'Authorization expiry date' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

export class RoadTaxDetailsDto {
  @ApiProperty() @IsUrl() frontImageUrl: string;
  @ApiProperty() @IsDateString() expiryDate: string;
}

export class GrantDetailsDto {
  @ApiProperty() @IsUrl() frontImageUrl: string;
  @ApiProperty() @IsString() @IsNotEmpty() ownerName: string;
  @ApiProperty() @IsString() @IsNotEmpty() ownerIcNumber: string;
}

export class EHailingInsuranceDetailsDto {
  @ApiProperty() @IsUrl() frontImageUrl: string;
  @ApiProperty() @IsUrl() backImageUrl: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() provider?: string;
}

export class KadPemanduDetailsDto {
  @ApiProperty() @IsUrl() imageUrl: string;
  @ApiProperty() @IsDateString() expiryDate: string;
}

export class CreateVehicleDocumentDto {
  @ApiProperty({
    enum: VehicleDocumentType,
    description: 'Type of vehicle document',
  })
  @IsEnum(VehicleDocumentType)
  documentType: VehicleDocumentType;

  @ApiPropertyOptional({ type: CarInsuranceDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CarInsuranceDetailsDto)
  carInsuranceDetails?: CarInsuranceDetailsDto;

  @ApiPropertyOptional({ type: CarRentalAgreementDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CarRentalAgreementDetailsDto)
  carRentalAgreementDetails?: CarRentalAgreementDetailsDto;

  @ApiPropertyOptional({ type: PuspakomInspectionDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PuspakomInspectionDetailsDto)
  puspakomInspectionDetails?: PuspakomInspectionDetailsDto;

  @ApiPropertyOptional({ type: TaxiPermitVehicleDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TaxiPermitVehicleDetailsDto)
  taxiPermitVehicleDetails?: TaxiPermitVehicleDetailsDto;

  @ApiPropertyOptional({ type: AuthorizationLetterDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AuthorizationLetterDetailsDto)
  authorizationLetterDetails?: AuthorizationLetterDetailsDto;

  @ApiPropertyOptional({ type: RoadTaxDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RoadTaxDetailsDto)
  roadTaxDetails?: RoadTaxDetailsDto;

  @ApiPropertyOptional({ type: GrantDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GrantDetailsDto)
  grantDetails?: GrantDetailsDto;

  @ApiPropertyOptional({ type: EHailingInsuranceDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => EHailingInsuranceDetailsDto)
  eHailingInsuranceDetails?: EHailingInsuranceDetailsDto;

  @ApiPropertyOptional({ type: KadPemanduDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => KadPemanduDetailsDto)
  kadPemanduDetails?: KadPemanduDetailsDto;

  @ApiPropertyOptional({ description: 'General expiry date for the document' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ description: 'Original filename when uploaded' })
  @IsOptional()
  @IsString()
  originalFileName?: string;
}

export class UpdateVehicleDocumentDto {
  @ApiPropertyOptional({ type: CarInsuranceDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CarInsuranceDetailsDto)
  carInsuranceDetails?: CarInsuranceDetailsDto;

  @ApiPropertyOptional({ type: CarRentalAgreementDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CarRentalAgreementDetailsDto)
  carRentalAgreementDetails?: CarRentalAgreementDetailsDto;

  @ApiPropertyOptional({ type: PuspakomInspectionDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PuspakomInspectionDetailsDto)
  puspakomInspectionDetails?: PuspakomInspectionDetailsDto;

  @ApiPropertyOptional({ type: TaxiPermitVehicleDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TaxiPermitVehicleDetailsDto)
  taxiPermitVehicleDetails?: TaxiPermitVehicleDetailsDto;

  @ApiPropertyOptional({ type: AuthorizationLetterDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AuthorizationLetterDetailsDto)
  authorizationLetterDetails?: AuthorizationLetterDetailsDto;

  @ApiPropertyOptional({ type: RoadTaxDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RoadTaxDetailsDto)
  roadTaxDetails?: RoadTaxDetailsDto;

  @ApiPropertyOptional({ type: GrantDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GrantDetailsDto)
  grantDetails?: GrantDetailsDto;

  @ApiPropertyOptional({ type: EHailingInsuranceDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => EHailingInsuranceDetailsDto)
  eHailingInsuranceDetails?: EHailingInsuranceDetailsDto;

  @ApiPropertyOptional({ type: KadPemanduDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => KadPemanduDetailsDto)
  kadPemanduDetails?: KadPemanduDetailsDto;

  @ApiPropertyOptional({ description: 'General expiry date for the document' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ description: 'Original filename when uploaded' })
  @IsOptional()
  @IsString()
  originalFileName?: string;
}

export class VehicleDocumentResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  vehicleId: string;

  @ApiProperty()
  uploadedByDriverId: string;

  @ApiProperty({ enum: VehicleDocumentType })
  documentType: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional({ type: CarInsuranceDetailsDto })
  carInsuranceDetails?: CarInsuranceDetailsDto;

  @ApiPropertyOptional({ type: CarRentalAgreementDetailsDto })
  carRentalAgreementDetails?: CarRentalAgreementDetailsDto;

  @ApiPropertyOptional({ type: PuspakomInspectionDetailsDto })
  puspakomInspectionDetails?: PuspakomInspectionDetailsDto;

  @ApiPropertyOptional({ type: TaxiPermitVehicleDetailsDto })
  taxiPermitVehicleDetails?: TaxiPermitVehicleDetailsDto;

  @ApiPropertyOptional({ type: AuthorizationLetterDetailsDto })
  authorizationLetterDetails?: AuthorizationLetterDetailsDto;

  @ApiPropertyOptional({ type: RoadTaxDetailsDto })
  roadTaxDetails?: RoadTaxDetailsDto;

  @ApiPropertyOptional({ type: GrantDetailsDto })
  grantDetails?: GrantDetailsDto;

  @ApiPropertyOptional({ type: EHailingInsuranceDetailsDto })
  eHailingInsuranceDetails?: EHailingInsuranceDetailsDto;

  @ApiPropertyOptional({ type: KadPemanduDetailsDto })
  kadPemanduDetails?: KadPemanduDetailsDto;

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
  isRequired: boolean;

  @ApiPropertyOptional()
  originalFileName?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class VehicleDocumentsSummaryDto {
  @ApiProperty()
  vehicleId: string;

  @ApiProperty({ description: 'Documents by type' })
  documents: {
    documentType: VehicleDocumentType;
    isUploaded: boolean;
    status: string;
    expiryDate?: Date;
    isExpiringSoon: boolean;
    isRequired: boolean;
  }[];

  @ApiProperty()
  hasCompleteDocumentation: boolean;

  @ApiProperty()
  overallStatus: 'pending' | 'verified' | 'rejected' | 'incomplete';

  @ApiProperty()
  uploadedCount: number;

  @ApiProperty()
  verifiedCount: number;

  @ApiProperty()
  rejectedCount: number;

  @ApiProperty()
  requiredCount: number;

  @ApiProperty()
  expiringSoonCount: number;

  @ApiProperty()
  lastUpdated?: Date;
}
