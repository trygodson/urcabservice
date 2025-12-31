import { ApiProperty } from '@nestjs/swagger';

export class OverallStatisticsDto {
  @ApiProperty()
  totalRides: number;

  @ApiProperty()
  activeDrivers: number;

  @ApiProperty()
  totalDrivers: number;

  @ApiProperty()
  pendingDocuments: number;

  @ApiProperty()
  pendingVehicleDocuments: number;
}

export class RideStatisticsDataDto {
  @ApiProperty()
  date: string;

  @ApiProperty()
  completedRides: number;

  @ApiProperty()
  cancelledRides: number;
}

export class PassengerRideStatisticsDto {
  @ApiProperty({ type: [RideStatisticsDataDto] })
  data: RideStatisticsDataDto[];
}

export class DriverStatusDto {
  @ApiProperty()
  activeDrivers: number;

  @ApiProperty()
  inactiveDrivers: number;

  @ApiProperty()
  onRideDrivers: number;
}

export class EvpStatisticsDataDto {
  @ApiProperty()
  date: string;

  @ApiProperty()
  count: number;
}

export class ApprovedEvpStatisticsDto {
  @ApiProperty({ type: [EvpStatisticsDataDto] })
  data: EvpStatisticsDataDto[];
}

export class DashboardResponseDto {
  @ApiProperty({ type: OverallStatisticsDto })
  overallStatistics: OverallStatisticsDto;

  @ApiProperty({ type: PassengerRideStatisticsDto })
  passengerRideStatistics: PassengerRideStatisticsDto;

  @ApiProperty({ type: DriverStatusDto })
  driverStatus: DriverStatusDto;

  @ApiProperty({ type: ApprovedEvpStatisticsDto })
  approvedEvp: ApprovedEvpStatisticsDto;
}

