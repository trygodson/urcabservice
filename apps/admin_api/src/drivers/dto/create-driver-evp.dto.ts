import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString, IsUrl, IsOptional, IsMongoId, MaxLength } from 'class-validator';

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
