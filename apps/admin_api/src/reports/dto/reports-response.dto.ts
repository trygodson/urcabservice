import { ApiProperty } from '@nestjs/swagger';

export class ZoneDataDto {
  @ApiProperty({ example: 'Airport' })
  zone: string;

  @ApiProperty({ example: 120 })
  trips: number;

  @ApiProperty({ example: 16000 })
  revenue: number;
}

export class TotalRidesDataDto {
  @ApiProperty({ example: 'Mon' })
  date: string;

  @ApiProperty({ example: 120 })
  trips: number;
}

export class RevenueAnalyticsDataDto {
  @ApiProperty({ example: 'Mon' })
  date: string;

  @ApiProperty({ example: 12000 })
  current: number;

  @ApiProperty({ example: 10000, required: false })
  lastPeriod?: number;

  @ApiProperty({ example: 12000 })
  revenueTrend: number;
}

export class ReportsResponseDto {
  @ApiProperty({ type: [ZoneDataDto], description: 'Rides grouped by pricing zone' })
  ridesByZone: ZoneDataDto[];

  @ApiProperty({ type: [ZoneDataDto], description: 'Revenue grouped by pricing zone' })
  revenueByZone: ZoneDataDto[];

  @ApiProperty({ type: [TotalRidesDataDto], description: 'Total rides over time' })
  totalRides: TotalRidesDataDto[];

  @ApiProperty({ type: [RevenueAnalyticsDataDto], description: 'Revenue analytics with current and last period' })
  revenueAnalytics: RevenueAnalyticsDataDto[];
}

