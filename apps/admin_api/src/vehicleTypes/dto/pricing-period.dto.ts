import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsNotEmpty, Min, Matches } from 'class-validator';

export class PricingPeriodDto {
  @ApiProperty({ description: 'Name of the pricing period (e.g., "Day Rate", "Night Rate")' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Start time of this pricing period (format: HH:MM)', example: '09:00' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in the format HH:MM (24-hour)',
  })
  startTime: string;

  @ApiProperty({ description: 'End time of this pricing period (format: HH:MM)', example: '17:00' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime must be in the format HH:MM (24-hour)',
  })
  endTime: string;

  @ApiProperty({ description: 'Base fare for the initial distance (e.g., 3RM for 0-2km)' })
  @IsNumber()
  @Min(0)
  baseFare: number;

  @ApiProperty({ description: 'Distance covered by the base fare in km (e.g., 2km)' })
  @IsNumber()
  @Min(0)
  baseDistance: number;

  @ApiProperty({ description: 'Additional fare per increment (e.g., 0.25RM)' })
  @IsNumber()
  @Min(0)
  incrementalRate: number;

  @ApiProperty({ description: 'Increment distance in km (e.g., 1km or 0.2km)' })
  @IsNumber()
  @Min(0)
  incrementalDistance: number;

  @ApiProperty({ description: 'Long distance in km (e.g., 1km or 0.2km)' })
  @IsNumber()
  @Min(0)
  longDistance: number;

  @ApiProperty({ description: 'Long distance surcharge (e.g., 1RM or 0.2RM)' })
  @IsNumber()
  @Min(0)
  longDistanceSurcharge: number;
}
