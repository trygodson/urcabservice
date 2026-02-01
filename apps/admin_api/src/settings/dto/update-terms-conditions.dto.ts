import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export enum UserType {
  PASSENGER = 'PASSENGER',
  DRIVER = 'DRIVER',
}

export class UpdateTermsConditionsDto {
  @ApiProperty({
    description: 'User type for which to update terms and conditions',
    enum: UserType,
    example: UserType.PASSENGER,
  })
  @IsEnum(UserType)
  @IsNotEmpty()
  userType: UserType;

  @ApiProperty({
    description: 'Terms and Conditions content as HTML string',
    example: '<html><body><h1>Terms & Conditions</h1><p>Content here...</p></body></html>',
  })
  @IsString()
  @IsNotEmpty()
  termsAndConditions: string;
}

