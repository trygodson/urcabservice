import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum TimePeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class GetDashboardStatisticsDto {
  @ApiProperty({
    required: false,
    enum: TimePeriod,
    default: TimePeriod.DAY,
    description: 'Time period for passenger ride statistics',
  })
  @IsOptional()
  @IsEnum(TimePeriod)
  ridePeriod?: TimePeriod = TimePeriod.DAY;

  @ApiProperty({
    required: false,
    enum: TimePeriod,
    default: TimePeriod.MONTH,
    description: 'Time period for approved EVP statistics',
  })
  @IsOptional()
  @IsEnum(TimePeriod)
  evpPeriod?: TimePeriod = TimePeriod.MONTH;
}

