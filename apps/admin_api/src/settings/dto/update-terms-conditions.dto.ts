import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateTermsConditionsDto {
  @ApiProperty({
    description: 'Terms and Conditions content as HTML string',
    example: '<html><body><h1>Terms & Conditions</h1><p>Content here...</p></body></html>',
  })
  @IsString()
  @IsNotEmpty()
  termsAndConditions: string;
}

