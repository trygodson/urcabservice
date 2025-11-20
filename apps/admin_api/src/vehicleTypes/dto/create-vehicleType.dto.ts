import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsUrl,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VehicleTypeEnum } from '@urcab-workspace/shared';
import { PricingPeriodDto } from './pricing-period.dto';

export class CreateVehicleTypeDto {
  @ApiProperty({ description: 'Vehicle type name (from VehicleType enum)' })
  @IsString()
  @IsEnum(VehicleTypeEnum)
  name: string;

  @ApiProperty({ description: 'Description of the vehicle type', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Array of pricing periods for different times of day',
    type: () => PricingPeriodDto,
    isArray: true,
  })
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => PricingPeriodDto)
  pricingPeriods: PricingPeriodDto[];

  @ApiProperty({ description: 'Passenger capacity for this vehicle type' })
  @IsNumber()
  @Min(0)
  capacity: number;

  @ApiProperty({ description: 'URL for vehicle type icon', required: false })
  @IsOptional()
  @IsString()
  @IsUrl()
  iconUrl?: string;

  @ApiProperty({ description: 'Whether this vehicle type is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
