import { ApiProperty } from '@nestjs/swagger';

export class EmergencyContactResponseDto {
  @ApiProperty({ description: 'Emergency contact id' })
  _id: string;

  @ApiProperty({ description: 'Contact name' })
  name: string;

  @ApiProperty({ description: 'Contact phone number' })
  phoneNumber: string;
}
