import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateDepositDto {
  @ApiProperty({
    description: 'Deposit amount',
    example: 100.0,
    minimum: 0.01,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount: number;

  @ApiProperty({
    description: 'Payment reference (optional)',
    example: 'PAY123456789',
    required: false,
  })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty({
    description: 'Transaction description (optional)',
    example: 'Wallet top-up via card',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}

