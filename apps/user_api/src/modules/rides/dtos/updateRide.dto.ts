import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsNumber, Min } from 'class-validator';
import { RideStatus } from '@urcab-workspace/shared';

export class UpdateRideDto {
  @ApiProperty({
    enum: RideStatus,
    description: 'New status of the ride',
    required: false,
  })
  @IsOptional()
  @IsEnum(RideStatus, { message: 'Invalid ride status' })
  status?: RideStatus;

  @ApiProperty({
    example: 18.75,
    description: 'Final fare amount',
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Final fare must be a number' })
  @Min(0, { message: 'Final fare must be positive' })
  finalFare?: number;

  @ApiProperty({
    example: 12.5,
    description: 'Actual distance traveled',
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Actual distance must be a number' })
  @Min(0, { message: 'Actual distance must be positive' })
  actualDistance?: number;

  @ApiProperty({
    example: 25,
    description: 'Actual duration in minutes',
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Actual duration must be a number' })
  @Min(0, { message: 'Actual duration must be positive' })
  actualDuration?: number;
}
