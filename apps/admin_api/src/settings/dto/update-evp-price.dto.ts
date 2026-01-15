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
}

