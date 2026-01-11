import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum EarningsPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class GetEarningsDto {
  @ApiProperty({
    required: false,
    enum: EarningsPeriod,
    default: EarningsPeriod.DAY,
    description: 'Time period for earnings (day, week, or month)',
    example: EarningsPeriod.DAY,
  })
  @IsOptional()
  @IsEnum(EarningsPeriod)
  period?: EarningsPeriod = EarningsPeriod.DAY;
}

