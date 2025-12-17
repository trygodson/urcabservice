import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail, IsOptional, IsBoolean } from 'class-validator';

export class CreateAdminUserDto {
  @ApiProperty({ description: 'User full name' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ description: 'User email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'User password' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ description: 'Role ID to assign to the user' })
  @IsString()
  @IsNotEmpty()
  roleId: string;

  @ApiProperty({ description: 'Whether the user is active', default: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

