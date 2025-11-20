import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';

export class DriverEvpResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  driverId: string;

  @ApiProperty()
  certificateNumber: string;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty()
  documentUrl: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ required: false })
  notes?: string;

  @ApiProperty()
  issuedBy: string;

  @ApiProperty({ required: false })
  revokedAt?: Date;

  @ApiProperty({ required: false })
  revokedBy?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
