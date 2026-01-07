import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';

export class FaqResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  _id: Types.ObjectId;

  @ApiProperty({ example: 'How do I book a ride?' })
  question: string;

  @ApiProperty({ example: 'You can book a ride by opening the app...' })
  answer: string;

  @ApiProperty({ example: 'Booking', required: false })
  category?: string;

  @ApiProperty({ example: 1, required: false })
  order?: number;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 0, required: false })
  viewCount?: number;

  @ApiProperty({ required: false })
  createdBy?: Types.ObjectId;

  @ApiProperty({ required: false })
  updatedBy?: Types.ObjectId;

  @ApiProperty()
  createdAt?: Date;

  @ApiProperty()
  updatedAt?: Date;
}

