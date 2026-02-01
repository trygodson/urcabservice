import { ApiProperty } from '@nestjs/swagger';

export class WalletBalanceResponseDto {
  @ApiProperty({ example: 500.0, description: 'Current balance from completed transactions only' })
  balance: number;

  @ApiProperty({
    example: 450.0,
    description: 'Available balance including both completed and pending transactions (actual available amount)',
  })
  availableBalance: number;

  @ApiProperty({ example: 'RM', description: 'Currency symbol' })
  currencySymbol: string;

  @ApiProperty({ example: 'MYR', description: 'Currency code' })
  currency: string;
}

