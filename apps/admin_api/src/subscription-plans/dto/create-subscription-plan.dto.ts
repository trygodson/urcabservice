import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, Min, MaxLength } from 'class-validator';
import { SubscriptionType } from '@urcab-workspace/shared';

export class CreateSubscriptionPlanDto {
  @ApiProperty({ description: 'Plan name (e.g., Daily Plan, Weekly Plan, Monthly Plan)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Plan price' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: 'Plan description', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: 'Number of days the subscription is valid (1 for daily, 7 for weekly, 30 for monthly)' })
  @IsNumber()
  @Min(1)
  validity: number;

  @ApiProperty({ description: 'Subscription type', enum: SubscriptionType })
  @IsEnum(SubscriptionType)
  type: SubscriptionType;

  @ApiProperty({ description: 'Plan status', enum: ['active', 'inactive'], default: 'active', required: false })
  @IsString()
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: string;
}

