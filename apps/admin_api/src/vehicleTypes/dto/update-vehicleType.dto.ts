import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, IsUrl, Min } from 'class-validator';

export class UpdateVehicleTypeDto {
  @ApiProperty({ description: 'Description of the vehicle type', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Price per kilometer for this vehicle type', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerKM?: number;

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
