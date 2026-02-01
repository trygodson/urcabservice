import { ApiProperty } from '@nestjs/swagger';

export class EvpTransactionResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  transactionRef: string;

  @ApiProperty()
  driverName: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  paymentMethod: string;

  @ApiProperty()
  date: Date;

  @ApiProperty({ required: false })
  vehicleId?: string;
}

export class EvpTransactionsListResponseDto {
  @ApiProperty({ type: [EvpTransactionResponseDto] })
  transactions: EvpTransactionResponseDto[];

  @ApiProperty()
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
