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
  IsMongoId,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { VehicleBodyType, VehicleOwnership, VehicleAssemblyInfo, InsuredNameType, DriveCity } from '@urcab-workspace/shared';

export class CreateVehicleDto {
  @ApiPropertyOptional({
    description: 'Vehicle name/brand',
    example: 'Toyota Camry',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  name?: string;

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

  @ApiPropertyOptional({
    description: 'Vehicle Identification Number (VIN)',
    example: 'JH4KA4540MC123456',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  vin?: string;

  @ApiPropertyOptional({ description: 'Seating capacity', minimum: 1, maximum: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  seatingCapacity?: number;

  @ApiPropertyOptional({ description: 'Body type', enum: VehicleBodyType })
  @IsOptional()
  @IsEnum(VehicleBodyType)
  bodyType?: string;

  @ApiPropertyOptional({ description: 'Vehicle ownership', enum: VehicleOwnership })
  @IsOptional()
  @IsEnum(VehicleOwnership)
  vehicleOwnership?: string;

  @ApiPropertyOptional({ description: 'Assembly info', enum: VehicleAssemblyInfo })
  @IsOptional()
  @IsEnum(VehicleAssemblyInfo)
  assemblyInfo?: string;

  @ApiPropertyOptional({ description: 'Registered date' })
  @IsOptional()
  @IsDateString()
  registeredDate?: string;

  @ApiPropertyOptional({ description: 'Insured name type', enum: InsuredNameType })
  @IsOptional()
  @IsEnum(InsuredNameType)
  insuredName?: string;

  @ApiPropertyOptional({ description: 'Authorization letter image URL' })
  @IsOptional()
  @IsUrl()
  authorizationLetterImageUrl?: string;

  @ApiPropertyOptional({ description: 'Drive city', enum: DriveCity })
  @IsOptional()
  @IsEnum(DriveCity)
  driveCity?: string;

  @ApiPropertyOptional({
    description: 'Vehicle type',
    example: 'sedan',
    maxLength: 50,
  })
  @IsOptional()
  @IsMongoId()
  @Length(1, 50)
  vehicleTypeId?: string;

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

  @ApiPropertyOptional({ description: 'Seating capacity', minimum: 1, maximum: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  seatingCapacity?: number;

  @ApiPropertyOptional({ description: 'Body type', enum: VehicleBodyType })
  @IsOptional()
  @IsEnum(VehicleBodyType)
  bodyType?: string;

  @ApiPropertyOptional({ description: 'Vehicle ownership', enum: VehicleOwnership })
  @IsOptional()
  @IsEnum(VehicleOwnership)
  vehicleOwnership?: string;

  @ApiPropertyOptional({ description: 'Assembly info', enum: VehicleAssemblyInfo })
  @IsOptional()
  @IsEnum(VehicleAssemblyInfo)
  assemblyInfo?: string;

  @ApiPropertyOptional({ description: 'Registered date' })
  @IsOptional()
  @IsDateString()
  registeredDate?: string;

  @ApiPropertyOptional({ description: 'Insured name type', enum: InsuredNameType })
  @IsOptional()
  @IsEnum(InsuredNameType)
  insuredName?: string;

  @ApiPropertyOptional({ description: 'Authorization letter image URL' })
  @IsOptional()
  @IsUrl()
  authorizationLetterImageUrl?: string;

  @ApiPropertyOptional({ description: 'Drive city', enum: DriveCity })
  @IsOptional()
  @IsEnum(DriveCity)
  driveCity?: string;

  @ApiPropertyOptional({
    description: 'Vehicle type',
    maxLength: 50,
  })
  @IsOptional()
  @IsMongoId()
  @Length(1, 50)
  vehicleTypeId?: string;

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
  vehicleType?: any;

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

  @ApiPropertyOptional()
  evpPrice?: number;

  @ApiPropertyOptional()
  evpPriceSet?: boolean;

  @ApiPropertyOptional()
  evpAdminGeneratedPending?: boolean;

  @ApiPropertyOptional()
  evp?: {
    _id: string;
    certificateNumber: string;
    startDate: Date;
    endDate: Date;
    documentUrl: string;
    isActive: boolean;
    notes?: string;
  };

  @ApiPropertyOptional()
  bodyType?: string;

  @ApiPropertyOptional()
  vehicleOwnership?: string;

  @ApiPropertyOptional()
  assemblyInfo?: string;

  @ApiPropertyOptional()
  registeredDate?: Date;

  @ApiPropertyOptional()
  insuredName?: string;

  @ApiPropertyOptional()
  authorizationLetterImageUrl?: string;

  @ApiPropertyOptional()
  driveCity?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
