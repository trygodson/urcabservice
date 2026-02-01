import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, Matches } from 'class-validator';

export class CreateEmergencyContactDto {
  @ApiProperty({ description: 'Full name of the emergency contact', example: 'Jane Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Relationship of the emergency contact', example: 'spouse' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  relationship: string;

  @ApiProperty({
    description: 'Phone number of the emergency contact',
    example: '+60123456789',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Matches(/^[0-9+\-\s()]+$/, { message: 'phoneNumber must contain only digits and phone symbols' })
  phoneNumber: string;
}
export class UpdateEmergencyContactDto {
  @ApiProperty({ description: 'Full name of the emergency contact', example: 'Jane Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Relationship of the emergency contact', example: 'spouse' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  relationship: string;

  @ApiProperty({
    description: 'Phone number of the emergency contact',
    example: '+60123456789',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Matches(/^[0-9+\-\s()]+$/, { message: 'phoneNumber must contain only digits and phone symbols' })
  phoneNumber: string;
}
