import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RideStatus, RideType, VehicleType } from '@urcab-workspace/shared';
import { IsNumber, IsPositive, Min } from 'class-validator';

export class RideResponseDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Unique identifier for the ride',
  })
  _id: Types.ObjectId;

  @ApiProperty({
    example: '507f1f77bcf86cd799439012',
    description: 'ID of the passenger who booked the ride',
  })
  passengerId: Types.ObjectId;

  @ApiProperty({
    example: '507f1f77bcf86cd799439013',
    description: 'ID of the assigned driver',
    required: false,
  })
  driverId?: Types.ObjectId;

  @ApiProperty({
    description: 'Pickup location details',
  })
  pickupLocation: {
    type: string;
    coordinates: number[];
    address: string;
    placeId?: string;
    landmark?: string;
  };

  @ApiProperty({
    description: 'Drop-off location details',
  })
  dropoffLocation: {
    type: string;
    coordinates: number[];
    address: string;
    placeId?: string;
    landmark?: string;
  };

  @ApiProperty({
    enum: RideType,
    description: 'Type of ride',
  })
  rideType: RideType;

  @ApiProperty({
    enum: RideStatus,
    description: 'Current status of the ride',
  })
  status: RideStatus;

  @ApiProperty({
    example: 15.5,
    description: 'Estimated fare for the ride',
  })
  estimatedFare: number;

  @ApiProperty({
    example: 18.75,
    description: 'Final fare amount',
    required: false,
  })
  finalFare?: number;

  @ApiProperty({
    example: 12.5,
    description: 'Estimated distance in kilometers',
  })
  estimatedDistance: number;

  @ApiProperty({
    example: 25,
    description: 'Estimated duration in minutes',
  })
  estimatedDuration: number;

  @ApiProperty({
    example: '2024-08-07T10:30:00.000Z',
    description: 'Scheduled time for the ride',
    required: false,
  })
  scheduledTime?: Date;

  @ApiProperty({
    example: 2,
    description: 'Number of passengers',
  })
  passengerCount: number;

  @ApiProperty({
    example: 'Please call when you arrive',
    description: 'Special requests from passenger',
    required: false,
  })
  specialRequests?: string;

  @ApiProperty({
    example: '2024-08-07T09:15:00.000Z',
    description: 'When the ride was created',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2024-08-07T09:16:00.000Z',
    description: 'When the ride was last updated',
  })
  updatedAt: Date;

  @ApiProperty({
    example: '2024-08-07T09:20:00.000Z',
    description: 'When driver was assigned',
    required: false,
  })
  driverAssignedAt?: Date;

  @ApiProperty({
    example: '2024-08-07T10:30:00.000Z',
    description: 'When the ride started',
    required: false,
  })
  startedAt?: Date;

  @ApiProperty({
    example: '2024-08-07T11:00:00.000Z',
    description: 'When the ride was completed',
    required: false,
  })
  completedAt?: Date;
}

export class VehiclePriceRequestDto {
  @ApiProperty({
    description: 'Required passenger capacity',
    example: 4,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  @IsPositive()
  seatingCapacity: number;

  @ApiProperty({
    description: 'Distance in kilometers',
    example: 10.5,
    minimum: 0.1,
  })
  @IsNumber()
  @IsPositive()
  distance: number;
}

export class VehiclePriceDto {
  @ApiProperty({
    description: 'Type of vehicle',
    enum: VehicleType,
    example: VehicleType.SEDAN,
  })
  type: string;

  @ApiProperty({
    description: 'Seating capacity of the vehicle',
    example: 4,
  })
  capacity: number;

  @ApiProperty({
    description: 'Estimated price for the ride in the local currency',
    example: 25.5,
  })
  estimatedPrice: number;

  @ApiProperty({
    description: 'Estimated duration of the ride in minutes',
    example: 20,
  })
  estimatedDuration: number;
}

export class VehiclePriceListResponseDto {
  @ApiProperty({
    description: 'List of available vehicles with pricing',
    type: [VehiclePriceDto],
  })
  vehicles: VehiclePriceDto[];
}
