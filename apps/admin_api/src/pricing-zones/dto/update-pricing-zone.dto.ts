import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, Min, Max } from 'class-validator';

export class UpdatePricingZoneDto {
  @ApiProperty({ description: 'Name of pricing zone', example: 'Downtown KL', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Description of the zone',
    example: 'High demand area in downtown Kuala Lumpur',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Price multiplier for this zone (1.0 is standard, >1.0 is more expensive, <1.0 is cheaper)',
    example: 1.5,
    minimum: 0.5,
    maximum: 3.0,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0.5)
  @Max(3.0)
  priceMultiplier?: number;

  @ApiProperty({
    description: 'Center point longitude of the zone',
    example: 101.7152,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  centerLongitude?: number;

  @ApiProperty({
    description: 'Center point latitude of the zone',
    example: 3.1548,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  centerLatitude?: number;

  @ApiProperty({
    description: 'Radius of the zone in kilometers',
    example: 5,
    minimum: 0.1,
    maximum: 50,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0.1)
  @Max(50)
  radiusKm?: number;

  @ApiProperty({ description: 'Whether this zone is active', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
