import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UpdatePrivacyPolicyDto {
  @ApiProperty({
    description: 'Privacy policy content as HTML string',
    example: '<html><body><h1>Privacy Policy</h1><p>Content here...</p></body></html>',
  })
  @IsString()
  @IsNotEmpty()
  privacyPolicy: string;
}

