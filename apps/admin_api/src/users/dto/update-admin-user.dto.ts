import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, IsBoolean } from 'class-validator';

export class UpdateAdminUserDto {
  @ApiProperty({ description: 'User full name', required: false })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({ description: 'User email address', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: 'User password', required: false })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiProperty({ description: 'Role ID to assign to the user', required: false })
  @IsString()
  @IsOptional()
  roleId?: string;

  @ApiProperty({ description: 'Whether the user is active', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

