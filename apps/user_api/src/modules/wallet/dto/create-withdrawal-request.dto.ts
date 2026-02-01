import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateWithdrawalRequestDto {
  @ApiProperty({
    description: 'Withdrawal amount',
    example: 100.0,
    minimum: 0.01,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount: number;

  @ApiProperty({
    description: 'Bank account ID (optional, uses default if not provided)',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  @IsOptional()
  @IsString()
  bankAccountId?: string;

  @ApiProperty({
    description: 'Additional notes',
    example: 'Please process urgently',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
