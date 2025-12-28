import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsDateString, IsNumber, IsBoolean, Min, MaxLength } from 'class-validator';

export class CreateDriverSubscriptionDto {
  @ApiProperty({ description: 'Driver ID' })
  @IsString()
  @IsNotEmpty()
  driverId: string;

  @ApiProperty({ description: 'Subscription plan ID' })
  @IsString()
  @IsNotEmpty()
  planId: string;

  @ApiProperty({ description: 'Start date of the subscription', required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string; // If not provided, will use current date

  @ApiProperty({ description: 'Payment method', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  paymentMethod?: string;

  @ApiProperty({ description: 'Payment reference', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  paymentReference?: string;

  @ApiProperty({ description: 'Payment date', required: false })
  @IsDateString()
  @IsOptional()
  paymentDate?: string;

  @ApiProperty({ description: 'Auto renew subscription', default: true, required: false })
  @IsBoolean()
  @IsOptional()
  autoRenew?: boolean;

  @ApiProperty({ description: 'Discount percentage', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  discountPercentage?: number;

  @ApiProperty({ description: 'Discount reason', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  discountReason?: string;

  @ApiProperty({ description: 'Admin notes', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}

