import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum TimePeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class GetReportsDto {
  @ApiProperty({
    required: false,
    enum: TimePeriod,
    default: TimePeriod.DAY,
    description: 'Time period for reports (day, week, or month)',
  })
  @IsOptional()
  @IsEnum(TimePeriod)
  period?: TimePeriod = TimePeriod.DAY;
}

