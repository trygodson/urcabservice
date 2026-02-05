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

  @ApiProperty({ example: 0, required: false })
  viewCount?: number;

  @ApiProperty()
  createdAt?: Date;

  @ApiProperty()
  updatedAt?: Date;
}

export class FaqsListResponseDto {
  @ApiProperty({ type: [FaqResponseDto] })
  faqs: FaqResponseDto[];

  @ApiProperty({
    example: {
      page: 1,
      limit: 10,
      total: 50,
      totalPages: 5,
    },
  })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
