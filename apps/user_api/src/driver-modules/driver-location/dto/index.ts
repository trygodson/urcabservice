import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DriverOnlineStatus } from '@urcab-workspace/shared';
import { IsNumber, IsEnum, IsOptional, IsString, Min, Max, IsBoolean } from 'class-validator';

export class UpdateDriverLocationDto {
  @ApiProperty({
    example: 101.6869,
    description: 'Longitude coordinate',
    minimum: -180,
    maximum: 180,
  })
  @IsNumber({}, { message: 'Longitude must be a valid number' })
  @Min(-180, { message: 'Longitude must be at least -180' })
  @Max(180, { message: 'Longitude must be at most 180' })
  longitude: number;

  @ApiProperty({
    example: 3.139,
    description: 'Latitude coordinate',
    minimum: -90,
    maximum: 90,
  })
  @IsNumber({}, { message: 'Latitude must be a valid number' })
  @Min(-90, { message: 'Latitude must be at least -90' })
  @Max(90, { message: 'Latitude must be at most 90' })
  latitude: number;

  @ApiPropertyOptional({
    enum: DriverOnlineStatus,
    description: 'Driver status',
    example: DriverOnlineStatus.ONLINE,
    required: false,
  })
  @IsOptional()
  @IsEnum(DriverOnlineStatus, { message: 'Invalid driver status' })
  status?: DriverOnlineStatus;

  @ApiPropertyOptional({
    example: 45,
    description: 'Direction the driver is facing (0-360 degrees)',
    minimum: 0,
    maximum: 360,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Heading must be a valid number' })
  @Min(0, { message: 'Heading must be at least 0' })
  @Max(360, { message: 'Heading must be at most 360' })
  heading?: number;

  @ApiPropertyOptional({
    example: 45.5,
    description: 'Speed in km/h',
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Speed must be a valid number' })
  @Min(0, { message: 'Speed must be at least 0' })
  speed?: number;

  @ApiPropertyOptional({
    example: 5,
    description: 'GPS accuracy in meters',
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Accuracy must be a valid number' })
  @Min(0, { message: 'Accuracy must be at least 0' })
  accuracy?: number;

  @ApiPropertyOptional({
    example: 'Jalan Bukit Bintang, Kuala Lumpur',
    description: 'Human-readable address',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Address must be a string' })
  address?: string;
}

export class UpdateDriverStatusDto {
  @ApiProperty({
    enum: DriverOnlineStatus,
    description: 'Driver status',
    example: DriverOnlineStatus.ONLINE,
  })
  @IsEnum(DriverOnlineStatus, { message: 'Invalid driver status' })
  status: DriverOnlineStatus;

  @ApiProperty({
    example: true,
    description: 'Whether driver is available for new rides',
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isAvailableForRides must be a boolean' })
  isAvailableForRides?: boolean;
}

export class FindNearbyDriversDto {
  @ApiProperty({
    example: 101.6869,
    description: 'Passenger longitude coordinate',
    minimum: -180,
    maximum: 180,
  })
  @IsNumber({}, { message: 'Longitude must be a valid number' })
  @Min(-180, { message: 'Longitude must be at least -180' })
  @Max(180, { message: 'Longitude must be at most 180' })
  longitude: number;

  @ApiProperty({
    example: 3.139,
    description: 'Passenger latitude coordinate',
    minimum: -90,
    maximum: 90,
  })
  @IsNumber({}, { message: 'Latitude must be a valid number' })
  @Min(-90, { message: 'Latitude must be at least -90' })
  @Max(90, { message: 'Latitude must be at most 90' })
  latitude: number;

  @ApiProperty({
    example: 10,
    description: 'Search radius in kilometers',
    minimum: 1,
    maximum: 50,
    required: false,
    default: 10,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Radius must be a valid number' })
  @Min(1, { message: 'Radius must be at least 1 km' })
  @Max(50, { message: 'Radius must be at most 50 km' })
  radius?: number;

  @ApiProperty({
    example: 20,
    description: 'Maximum number of drivers to return',
    minimum: 1,
    maximum: 100,
    required: false,
    default: 20,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Limit must be a valid number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must be at most 100' })
  limit?: number;
}

export class DriverLocationResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  driverId: string;

  @ApiProperty()
  location: {
    type: string;
    coordinates: number[];
  };

  @ApiProperty()
  status: string;

  @ApiProperty()
  heading?: number;

  @ApiProperty()
  speed?: number;

  @ApiProperty()
  accuracy?: number;

  @ApiProperty()
  lastLocationUpdate: Date;

  @ApiProperty()
  lastStatusChange?: Date;

  @ApiProperty()
  isAvailableForRides: boolean;

  @ApiProperty()
  currentRideId?: string;

  @ApiProperty()
  address?: string;

  @ApiProperty()
  driver?: {
    firstName: string;
    lastName: string;
    phone: string;
    photo?: string;
    email: string;
  };

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class NearbyDriverResponseDto {
  @ApiProperty()
  driverId: string;

  @ApiProperty()
  location: {
    type: string;
    coordinates: number[];
  };

  @ApiProperty()
  status: string;

  @ApiProperty()
  distance: number; // Distance from requester in km

  @ApiProperty()
  lastLocationUpdate: Date;

  @ApiProperty()
  driver: {
    firstName: string;
    lastName: string;
    phone: string;
    photo?: string;
    email: string;
  };

  @ApiProperty()
  vehicle: {
    make: string;
    model: string;
    year: number;
    color: string;
    licensePlate: string;
    seatingCapacity: number;
    vehicleType: string;
  };

  @ApiProperty()
  heading?: number;

  @ApiProperty()
  speed?: number;

  @ApiProperty()
  estimatedArrivalTime?: number; // in minutes
}
