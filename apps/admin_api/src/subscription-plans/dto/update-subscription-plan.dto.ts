import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEnum, Min, MaxLength } from 'class-validator';
import { SubscriptionType } from '@urcab-workspace/shared';

export class UpdateSubscriptionPlanDto {
  @ApiProperty({ description: 'Plan name', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ description: 'Plan price', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;

  @ApiProperty({ description: 'Plan description', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: 'Number of days the subscription is valid', required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  validity?: number;

  @ApiProperty({ description: 'Plan status', enum: ['active', 'inactive'], required: false })
  @IsString()
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: string;
}

