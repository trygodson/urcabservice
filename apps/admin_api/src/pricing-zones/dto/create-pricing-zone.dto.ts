import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, IsNotEmpty, Min, Max } from 'class-validator';

export class CreatePricingZoneDto {
  @ApiProperty({ description: 'Name of pricing zone', example: 'Downtown KL' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Description of the zone', example: 'High demand area in downtown Kuala Lumpur' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Price multiplier for this zone (1.0 is standard, >1.0 is more expensive, <1.0 is cheaper)',
    example: 1.5,
    minimum: 0.5,
    maximum: 3.0,
  })
  @IsNumber()
  @Min(0.5)
  @Max(3.0)
  priceMultiplier: number;

  @ApiProperty({
    description: 'Center point longitude of the zone',
    example: 101.7152,
  })
  @IsNumber()
  centerLongitude: number;

  @ApiProperty({
    description: 'Center point latitude of the zone',
    example: 3.1548,
  })
  @IsNumber()
  centerLatitude: number;

  @ApiProperty({
    description: 'Radius of the zone in kilometers',
    example: 5,
    minimum: 0.1,
    maximum: 50,
  })
  @IsNumber()
  @Min(0.1)
  @Max(50)
  radiusKm: number;

  @ApiProperty({ description: 'Whether this zone is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
