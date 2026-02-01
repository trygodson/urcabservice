import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class CreateBankAccountDto {
  @ApiProperty({
    description: 'Bank name',
    example: 'Maybank',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  bankName: string;

  @ApiProperty({
    description: 'Account number',
    example: '1234567890',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  accountNumber: string;

  @ApiProperty({
    description: 'Account holder name',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  accountName: string;

  @ApiProperty({
    description: 'Bank code (Swift code, routing number, etc.)',
    example: 'MBB',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  bankCode?: string;

  @ApiProperty({
    description: 'Branch name',
    example: 'KL Main Branch',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  branchName?: string;

  @ApiProperty({
    description: 'Account type (savings, current, checking)',
    example: 'savings',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  accountType?: string;

  @ApiProperty({
    description: 'Set as default account',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiProperty({
    description: 'Additional notes',
    example: 'Primary account for withdrawals',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateBankAccountDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  accountNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  accountName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  bankCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  branchName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  accountType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
