import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsString,
  IsEnum,
  IsDateString,
  ValidateNested,
  Min,
  Max,
  MaxLength,
  IsMongoId,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PaymentMethod, RideType, VehicleType } from '@urcab-workspace/shared';
import { LocationDto } from './location.dto';

export class CreateRideDto {
  @ApiProperty({
    description: 'Pickup location details',
    type: LocationDto,
  })
  @ValidateNested()
  @Type(() => LocationDto)
  @IsNotEmpty({ message: 'Pickup location is required' })
  pickupLocation: LocationDto;

  @ApiProperty({
    description: 'Drop-off location details',
    type: LocationDto,
  })
  @ValidateNested()
  @Type(() => LocationDto)
  @IsNotEmpty({ message: 'Drop-off location is required' })
  dropoffLocation: LocationDto;

  @ApiProperty({
    enum: RideType,
    description: 'Type of ride (immediate or scheduled)',
    example: RideType.IMMEDIATE,
  })
  @IsEnum(RideType, { message: 'Invalid ride type' })
  rideType: RideType;

  @ApiProperty({
    description: 'Vehicle type ID',
    example: '6895aa24e3cfb4357b561b46',
  })
  @IsMongoId({ message: 'Invalid vehicle type' })
  vehicleTypeId: string;

  @ApiProperty({
    enum: PaymentMethod,
    description: 'Payment Method (cash or card or qr_code)',
    example: PaymentMethod.CASH,
  })
  @IsEnum(PaymentMethod, { message: 'Invalid Payment Method' })
  @IsNotEmpty({ message: 'Payment method is required' })
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({
    example: '2024-12-31T10:30:00.000Z',
    description: 'Scheduled time for the ride (required for scheduled rides)',
    required: false,
  })
  @IsOptional()
  @IsDateString({ strict: false }, { message: 'Scheduled time must be a valid ISO date string' })
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  scheduledTime?: Date;

  @ApiPropertyOptional({
    example: 1,
    description: 'Number of passengers',
    minimum: 1,
    maximum: 4,
    required: false,
    default: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Passenger count must be a number' })
  @Min(1, { message: 'At least 1 passenger is required' })
  // @Max(4, { message: 'Maximum 4 passengers allowed' })
  @Transform(({ value }) => value || 1)
  passengerCount?: number;

  @ApiProperty({
    example: 1,
    description: 'Estimated price for the ride (calculated by system)',
    minimum: 1,
    maximum: 4,
    required: false,
    default: 1,
  })
  @IsNumber({}, { message: 'Estimated price must be a number' })
  // @Max(4, { message: 'Maximum 4 passengers allowed' })
  @Transform(({ value }) => value || 1)
  estimatedPrice?: number;

  @ApiProperty({
    example: 1,
    description: 'Estimated price for the ride (calculated by system)',
    minimum: 1,
    maximum: 4,
    required: false,
    default: 1,
  })
  @IsString({ message: 'Estimated distance must be a string' })
  // @Max(4, { message: 'Maximum 4 passengers allowed' })
  estimatedDistance?: string;

  @ApiProperty({
    example: 'Please call when you arrive at the pickup location',
    description: 'Special requests or instructions for the driver',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Special requests must be a string' })
  @MaxLength(500, { message: 'Special requests must not exceed 500 characters' })
  specialRequests?: string;

  // @ApiProperty({
  //   example: 15.5,
  //   description: 'Estimated fare for the ride (calculated by system)',
  //   required: false,
  // })
  // @IsOptional()
  // @IsNumber({}, { message: 'Estimated fare must be a number' })
  // @Min(0, { message: 'Estimated fare must be positive' })
  // estimatedFare?: number;
}
