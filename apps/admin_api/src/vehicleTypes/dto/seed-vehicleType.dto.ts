import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class SeedVehicleTypeDto {
  @ApiProperty({ description: 'Whether to override existing entries', default: false })
  @IsOptional()
  @IsBoolean()
  override?: boolean;
}
