import { ApiProperty } from '@nestjs/swagger';

export class EarningsHistogramDataDto {
  @ApiProperty({ description: 'Date or period label for the histogram bar' })
  label: string;

  @ApiProperty({ description: 'Earnings amount for this period' })
  earnings: number;

  @ApiProperty({ description: 'Number of completed rides for this period' })
  rides: number;
}

export class EarningsStatsDto {
  @ApiProperty({ description: 'Total number of completed ride transactions' })
  completedRides: number;

  @ApiProperty({ description: 'Total number of cancelled ride transactions' })
  cancelledRides: number;

  @ApiProperty({ description: 'Total number of pending ride transactions' })
  pendingRides: number;

  @ApiProperty({ description: 'Total earnings amount from completed rides' })
  totalEarnings: number;
}

export class EarningsResponseDto {
  @ApiProperty({ type: [EarningsHistogramDataDto], description: 'Histogram data for chart visualization' })
  histogram: EarningsHistogramDataDto[];

  @ApiProperty({ type: EarningsStatsDto, description: 'Summary statistics' })
  stats: EarningsStatsDto;
}

