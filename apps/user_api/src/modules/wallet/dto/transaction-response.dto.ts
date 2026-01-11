import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';

export class TransactionResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  _id: Types.ObjectId;

  @ApiProperty({ example: 'CRDEP1234567890ABCD' })
  transactionRef: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439012' })
  user: Types.ObjectId;

  @ApiProperty({ example: '507f1f77bcf86cd799439013' })
  wallet: Types.ObjectId;

  @ApiProperty({ example: 2, description: 'TransactionType: 1=DEBIT, 2=CREDIT' })
  type: number;

  @ApiProperty({ example: 'DEPOSIT' })
  category: string;

  @ApiProperty({ example: 'WITHDRAWABLE' })
  balanceType: string;

  @ApiProperty({ example: 'COMPLETED' })
  status: string;

  @ApiProperty({ example: 100.0 })
  amount: number;

  @ApiProperty({ example: 'MYR', required: false })
  currency?: string;

  @ApiProperty({ example: 'RM', required: false })
  currencySymbol?: string;

  @ApiProperty({ example: 0 })
  depositBalanceBefore: number;

  @ApiProperty({ example: 0 })
  depositBalanceAfter: number;

  @ApiProperty({ example: 500.0 })
  withdrawableBalanceBefore: number;

  @ApiProperty({ example: 600.0 })
  withdrawableBalanceAfter: number;

  @ApiProperty({ example: 500.0 })
  totalBalanceBefore: number;

  @ApiProperty({ example: 600.0 })
  totalBalanceAfter: number;

  @ApiProperty({ example: 'Wallet deposit' })
  description: string;

  @ApiProperty({ example: 'PAY123456789', required: false })
  reference?: string;

  @ApiProperty({ required: false })
  metadata?: Record<string, any>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ required: false })
  completedAt?: Date;
}

