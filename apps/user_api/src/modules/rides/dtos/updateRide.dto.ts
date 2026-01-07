import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
}

export class AddTipDto {
  @ApiPropertyOptional({
    description: 'Tip amount to add to the ride fare (in RM)',
    example: 5.0,
    type: Number,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Tip must be a number' })
  @Min(0, { message: 'Tip must be a non-negative number' })
  tip?: number;
}
