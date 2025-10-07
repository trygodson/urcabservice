import { ApiProperty } from '@nestjs/swagger';
// import { AutoMap } from '@automapper/classes';
import { Type } from 'class-transformer';
import { IsEmail, IsStrongPassword, IsString, IsDateString, IsOptional, MaxLength } from 'class-validator';

export class RegisterUserDto {
  @ApiProperty({
    example: 'John Doe',
  })
  @IsString()
  fullName: string;

  @ApiProperty({
    example: '+28383999933',
  })
  @IsString()
  phone: string;

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

  // @ApiProperty({
  //   enum: Role,
  // })
  // @IsEnum(Role)
  // type: Role;
}
export class UpdateDriverProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  // @Matches(/^\+?[1-9]\d{1,14}$/, {
  //   message: 'Phone number must be in international format',
  // })
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  photo?: string;
}

export class updateFCMDto {
  @ApiProperty({ required: false })
  @IsString()
  fcmToken?: string;
}
