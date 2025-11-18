import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, IsEnum, IsUrl, Min } from 'class-validator';
import { VehicleType } from '@urcab-workspace/shared';

export class CreateVehicleTypeDto {
  @ApiProperty({ description: 'Vehicle type name (from VehicleType enum)' })
  @IsString()
  @IsEnum(VehicleType)
  name: string;

  @ApiProperty({ description: 'Description of the vehicle type', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Price per kilometer for this vehicle type' })
  @IsNumber()
  @Min(0)
  pricePerKM: number;

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
