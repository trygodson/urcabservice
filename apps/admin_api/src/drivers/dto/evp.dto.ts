import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateDriverEvpDto {
  @ApiProperty({ description: 'Driver ID' })
  @IsMongoId()
  @IsNotEmpty()
  driverId: string;

  @ApiProperty({ description: 'Certificate number for the EVP' })
  @IsString()
  @IsNotEmpty()
  certificateNumber: string;

  @ApiProperty({ description: 'Start date of EVP validity', example: '2025-12-01' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ description: 'End date of EVP validity', example: '2026-12-01' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({ description: 'URL to the EVP document' })
  @IsUrl()
  @IsNotEmpty()
  documentUrl: string;

  @ApiProperty({ description: 'Additional notes about the EVP', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}

export class RevokeDriverEvpDto {
  @ApiProperty({ description: 'Reason for revoking the EVP' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

export class GetDriverEvpsDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  activeOnly?: boolean = false;
}

export class DriverEvpResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  driverId: string;

  @ApiProperty()
  certificateNumber: string;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty()
  documentUrl: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ required: false })
  notes?: string;

  @ApiProperty()
  issuedBy: string;

  @ApiProperty({ required: false })
  revokedAt?: Date;

  @ApiProperty({ required: false })
  revokedBy?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class SetVehicleEvpPriceDto {
  @ApiProperty({ description: 'EVP price in RM', example: 100.0, minimum: 0.01 })
  @IsNumber()
  @IsNotEmpty()
  @Min(0.01)
  evpPrice: number;
}

export class CreateVehicleEvpDto {
  @ApiProperty({ description: 'Vehicle ID' })
  @IsMongoId()
  @IsNotEmpty()
  vehicleId: string;

  @ApiProperty({ description: 'Certificate number for the EVP' })
  @IsString()
  @IsNotEmpty()
  certificateNumber: string;

  @ApiProperty({ description: 'Start date of EVP validity', example: '2025-12-01' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ description: 'End date of EVP validity', example: '2026-12-01' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({ description: 'URL to the EVP document' })
  @IsUrl()
  @IsNotEmpty()
  documentUrl: string;

  @ApiProperty({ description: 'Additional notes about the EVP', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}

export class VehicleEvpResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  vehicleId: string;

  @ApiProperty()
  certificateNumber: string;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty()
  documentUrl: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ required: false })
  notes?: string;

  @ApiProperty()
  issuedBy: string;

  @ApiProperty({ required: false })
  revokedAt?: Date;

  @ApiProperty({ required: false })
  revokedBy?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
