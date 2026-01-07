import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, IsNotEmpty, Min, IsIn } from 'class-validator';

export class CreateFaqDto {
  @ApiProperty({ description: 'FAQ question', example: 'How do I book a ride?' })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({
    description: 'FAQ answer',
    example:
      'You can book a ride by opening the app, selecting your pickup and dropoff locations, and confirming your booking.',
  })
  @IsString()
  @IsNotEmpty()
  answer: string;

  @ApiProperty({
    enum: ['Driver', 'Passenger'],
    description: 'FAQ category (e.g., Driver, Passenger, Booking, etc.)',
    example: 'Driver',
    required: false,
    default: 'Driver',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['Driver', 'Passenger'])
  category?: string;

  @ApiProperty({
    description: 'Display order for sorting FAQs (lower numbers appear first)',
    example: 1,
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;

  @ApiProperty({ description: 'Whether the FAQ is active and visible', default: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
