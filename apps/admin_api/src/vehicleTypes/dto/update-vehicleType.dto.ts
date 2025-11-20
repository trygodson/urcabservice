import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, IsUrl, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PricingPeriodDto } from './pricing-period.dto';

export class UpdateVehicleTypeDto {
  @ApiProperty({ description: 'Description of the vehicle type', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Array of pricing periods for different times of day',
    type: () => PricingPeriodDto,
    isArray: true,
    required: false,
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PricingPeriodDto)
  pricingPeriods?: PricingPeriodDto[];

  @ApiProperty({ description: 'Passenger capacity for this vehicle type', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  capacity?: number;

  @ApiProperty({ description: 'URL for vehicle type icon', required: false })
  @IsOptional()
  @IsString()
  @IsUrl()
  iconUrl?: string;

  @ApiProperty({ description: 'Whether this vehicle type is active', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
