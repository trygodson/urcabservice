import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, IsOptional, ArrayMinSize, IsBoolean } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ description: 'Role name (e.g., Support Admin, Fleet Manager)' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Role description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Array of permission IDs', type: [String] })
  @IsArray()
  @ArrayMinSize(0)
  @IsString({ each: true })
  permissions: string[];

  @ApiProperty({ description: 'Whether the role is active', default: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

