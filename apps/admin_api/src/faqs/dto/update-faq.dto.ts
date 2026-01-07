import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, Min, IsIn, IsNotEmpty } from 'class-validator';

export class UpdateFaqDto {
  @ApiProperty({ description: 'FAQ question', example: 'How do I book a ride?', required: false })
  @IsOptional()
  @IsString()
  question?: string;

  @ApiProperty({
    description: 'FAQ answer',
    example:
      'You can book a ride by opening the app, selecting your pickup and dropoff locations, and confirming your booking.',
    required: false,
  })
  @IsOptional()
  @IsString()
  answer?: string;

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
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;

  @ApiProperty({ description: 'Whether the FAQ is active and visible', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
