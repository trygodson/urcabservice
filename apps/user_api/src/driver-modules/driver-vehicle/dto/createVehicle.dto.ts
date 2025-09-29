import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsBoolean,
  IsUrl,
  Length,
  Min,
  Max,
  IsNotEmpty,
  Matches,
  ArrayMaxSize,
} from 'class-validator';

export class CreateVehicleDto {
  @ApiProperty({
    description: 'Vehicle name/brand',
    example: 'Toyota Camry',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  name: string;

  @ApiProperty({
    description: 'Vehicle make',
    example: 'Toyota',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  make: string;

  @ApiProperty({
    description: 'Vehicle model',
    example: 'Camry',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  model: string;

  @ApiProperty({
    description: 'Vehicle year',
    example: 2020,
    minimum: 1950,
  })
  @IsNumber()
  @Min(1950)
  @Max(new Date().getFullYear() + 1)
  year: number;

  @ApiProperty({
    description: 'Vehicle color',
    example: 'White',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  color: string;

  @ApiProperty({
    description: 'Vehicle license plate',
    example: 'ABC1234',
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 20)
  @Matches(/^[A-Z0-9\s\-]+$/i, { message: 'License plate contains invalid characters' })
  licensePlate: string;

  @ApiProperty({
    description: 'Vehicle Identification Number (VIN)',
    example: 'JH4KA4540MC123456',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @Length(10, 50)
  vin: string;

  @ApiProperty({
    description: 'Seating capacity',
    example: 4,
    minimum: 2,
    maximum: 8,
  })
  @IsNumber()
  @Min(2)
  @Max(8)
  seatingCapacity: number;

  @ApiPropertyOptional({
    description: 'Vehicle type',
    example: 'sedan',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  vehicleType?: string;

  @ApiPropertyOptional({
    description: 'Vehicle photos URL',
    type: String,
    maxItems: 10,
  })
  @IsUrl({})
  backPhoto?: string;
  @ApiPropertyOptional({
    description: 'Vehicle photos URL',
    type: String,
    maxItems: 10,
  })
  @IsUrl({})
  frontPhoto?: string;

  @ApiPropertyOptional({
    description: 'Vehicle photos URL',
    type: String,
    maxItems: 10,
  })
  @IsUrl({})
  leftPhoto?: string;
  @ApiPropertyOptional({
    description: 'Vehicle photos URL',
    type: String,
    maxItems: 10,
  })
  @IsUrl({})
  rightPhoto?: string;
  @ApiPropertyOptional({
    description: 'Vehicle photos URL',
    type: String,
    maxItems: 10,
  })
  @IsUrl({})
  frontRearPhoto?: string;
  @ApiPropertyOptional({
    description: 'Vehicle photos URL',
    type: String,
    maxItems: 10,
  })
  @IsUrl({})
  backRearPhoto?: string;

  @ApiPropertyOptional({
    description: 'Current odometer reading',
    example: 50000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  odometer?: number;

  @ApiPropertyOptional({
    description: 'Vehicle features',
    type: [String],
    example: ['air_conditioning', 'gps', 'bluetooth'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({
    description: 'Set as primary vehicle',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdateVehicleDto {
  @ApiPropertyOptional({
    description: 'Vehicle name/brand',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  name?: string;

  @ApiPropertyOptional({
    description: 'Vehicle make',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  make?: string;

  @ApiPropertyOptional({
    description: 'Vehicle model',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  model?: string;

  @ApiPropertyOptional({
    description: 'Vehicle year',
    minimum: 1950,
  })
  @IsOptional()
  @IsNumber()
  @Min(1950)
  @Max(new Date().getFullYear() + 1)
  year?: number;

  @ApiPropertyOptional({
    description: 'Vehicle color',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  color?: string;

  @ApiPropertyOptional({
    description: 'Vehicle license plate',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  @Matches(/^[A-Z0-9\s\-]+$/i, { message: 'License plate contains invalid characters' })
  licensePlate?: string;

  @ApiPropertyOptional({
    description: 'Vehicle Identification Number (VIN)',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Length(10, 50)
  vin?: string;

  @ApiPropertyOptional({
    description: 'Seating capacity',
    minimum: 2,
    maximum: 8,
  })
  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(8)
  seatingCapacity?: number;

  @ApiPropertyOptional({
    description: 'Vehicle type',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  vehicleType?: string;

  @ApiPropertyOptional({
    description: 'Vehicle photos URLs',
    type: [String],
    maxItems: 10,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({}, { each: true })
  photos?: string[];

  @ApiPropertyOptional({
    description: 'Current odometer reading',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  odometer?: number;

  @ApiPropertyOptional({
    description: 'Vehicle features',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({
    description: 'Set as primary vehicle',
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class VehicleResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  driverId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  make: string;

  @ApiProperty()
  model: string;

  @ApiProperty()
  year: number;

  @ApiProperty()
  color: string;

  @ApiProperty()
  licensePlate: string;

  @ApiProperty()
  vin: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  seatingCapacity: number;

  @ApiPropertyOptional()
  vehicleType?: string;

  @ApiPropertyOptional()
  backPhoto?: string;
  @ApiPropertyOptional()
  frontPhoto?: string;
  @ApiPropertyOptional()
  leftPhoto?: string;
  @ApiPropertyOptional()
  rightPhoto?: string;
  @ApiPropertyOptional()
  frontRearPhoto?: string;
  @ApiPropertyOptional()
  backRearPhoto?: string;

  @ApiPropertyOptional()
  lastInspectionDate?: Date;

  @ApiPropertyOptional()
  nextInspectionDue?: Date;

  @ApiPropertyOptional()
  verifiedByAdminId?: string;

  @ApiPropertyOptional()
  verifiedAt?: Date;

  @ApiPropertyOptional()
  verificationNotes?: string;

  @ApiPropertyOptional()
  rejectionReason?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  isPrimary: boolean;

  @ApiPropertyOptional()
  odometer?: number;

  @ApiPropertyOptional({ type: [String] })
  features?: string[];

  @ApiProperty()
  hasCompleteDocumentation: boolean;

  @ApiPropertyOptional()
  lastDocumentVerificationCheck?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
