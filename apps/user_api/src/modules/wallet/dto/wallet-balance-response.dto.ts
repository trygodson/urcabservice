import { ApiProperty } from '@nestjs/swagger';

export class WalletBalanceResponseDto {
  @ApiProperty({ example: 500.0, description: 'Current withdrawable balance' })
  balance: number;

  @ApiProperty({ example: 'RM', description: 'Currency symbol' })
  currencySymbol: string;

  @ApiProperty({ example: 'MYR', description: 'Currency code' })
  currency: string;
}

