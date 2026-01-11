import { ApiProperty } from '@nestjs/swagger';
import { TransactionResponseDto } from './transaction-response.dto';

export class TransactionsListResponseDto {
  @ApiProperty({ type: [TransactionResponseDto], description: 'List of transactions' })
  transactions: TransactionResponseDto[];

  @ApiProperty({ example: 50, description: 'Total number of transactions' })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page number' })
  page: number;

  @ApiProperty({ example: 10, description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ example: 5, description: 'Total number of pages' })
  totalPages: number;
}

