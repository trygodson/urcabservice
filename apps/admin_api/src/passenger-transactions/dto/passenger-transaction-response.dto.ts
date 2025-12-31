import { ApiProperty } from '@nestjs/swagger';

export class PassengerTransactionResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  transactionRef: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  paymentMethod: string;

  @ApiProperty()
  passengerName: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  driverName: string;

  @ApiProperty()
  date: Date;

  @ApiProperty()
  rideId?: string;
}

export class PassengerTransactionsListResponseDto {
  @ApiProperty({ type: [PassengerTransactionResponseDto] })
  transactions: PassengerTransactionResponseDto[];

  @ApiProperty()
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

