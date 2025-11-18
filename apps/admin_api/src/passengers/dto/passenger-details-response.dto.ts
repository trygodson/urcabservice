import { ApiProperty } from '@nestjs/swagger';

export class PassengerDetailsResponseDto {
  @ApiProperty()
  passenger: any;

  @ApiProperty()
  documents: any[];

  @ApiProperty()
  recentRides: any[];

  @ApiProperty()
  statistics: {
    totalRides: number;
    completedRides: number;
    cancelledRides: number;
    averageRating: number;
    totalSpent: number;
  };

  @ApiProperty()
  ratings: any[];
}
