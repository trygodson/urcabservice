import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsBoolean } from 'class-validator';

export class QueryRolesDto {
  @ApiProperty({
    required: false,
    description: 'Filter by active status. If not provided, returns all roles (active and inactive)',
    type: Boolean,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

