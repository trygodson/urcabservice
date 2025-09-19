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
}
