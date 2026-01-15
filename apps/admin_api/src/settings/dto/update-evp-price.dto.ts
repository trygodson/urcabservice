import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class UpdateEvpPriceDto {
  @ApiProperty({
    description: 'Global vehicle EVP price',
    example: 500.00,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  globalVehicleEvpPrice: number;

  @ApiProperty({
    description: 'Global vehicle EVP period in days (validity period)',
    example: 365,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  globalVehicleEvpPeriod: number;
}

