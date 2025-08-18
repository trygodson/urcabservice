import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
// import { AutoMap } from '@automapper/classes';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsStrongPassword,
} from 'class-validator';

export class LoginDto {
  // @AutoMap()
  @ApiProperty({
    example: 'email@email.com',
  })
  @IsEmail()
  email: string;

  // @AutoMap()
  @ApiProperty({
    example: 'Password@123',
  })
  @IsStrongPassword()
  password: string;

  @ApiPropertyOptional({
    example: 'Password@123',
  })
  @IsString()
  @IsOptional()
  fcmToken: string = null;

  // @AutoMap()
  // @ApiProperty()
  // @IsOptional()
  // @IsNumber()
  // // @ValidateNested()
  // // @Type(() => UserDto)
  // user_type?: number;
}
export class ResetPasswordDto {
  // @AutoMap()
  @ApiProperty({
    example: 'email@email.com',
  })
  @IsEmail()
  email: string;

  // @AutoMap()
  @ApiProperty({
    example: 'Password@123',
  })
  @IsStrongPassword()
  password: string;

  @ApiPropertyOptional({
    example: 'Password@123',
  })
  @IsString()
  // @IsOptional()
  otp: string;
}
export class ForgotPasswordDto {
  // @AutoMap()
  @ApiProperty({
    example: 'email@email.com',
  })
  @IsEmail()
  email: string;
}
export class GoogleSignDto {
  // @AutoMap()
  @ApiProperty({})
  @IsString()
  accessToken: string;
}
