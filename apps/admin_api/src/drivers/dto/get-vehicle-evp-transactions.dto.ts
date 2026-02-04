import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';

export enum Status {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export class GetVehicleEvpTransactionsDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  // @ApiProperty({ required: false, description: 'Start date in ISO format (YYYY-MM-DD)' })
  // @IsOptional()
  // @IsDateString()
  // startDate?: string;

  // @ApiProperty({ required: false, description: 'End date in ISO format (YYYY-MM-DD)' })
  // @IsOptional()
  // @IsDateString()
  // endDate?: string;

  // @ApiProperty({ required: false, description: 'Transaction status filter' })
  // @IsOptional()
  // @IsEnum(Status)
  // status?: string;
}
