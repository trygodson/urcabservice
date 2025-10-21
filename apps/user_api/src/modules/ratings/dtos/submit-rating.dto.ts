import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class SubmitRatingDto {
  @ApiProperty({
    description: 'The ride ID for which the rating is submitted',
    example: '60d0fe4f5311236168a109ca',
  })
  @IsMongoId()
  @IsNotEmpty()
  rideId: string;

  @ApiProperty({
    description: 'The overall rating from 1 to 5 stars',
    example: 4.5,
    minimum: 1,
    maximum: 5,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  overallRating: number;

  @ApiProperty({
    description: 'Optional comment about the ride experience',
    example: 'The driver was very professional and the car was clean.',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;

  @ApiProperty({
    description: 'Whether to make this rating public (visible to other users)',
    example: true,
    required: false,
    default: false,
  })
  @IsOptional()
  isPublic?: boolean;
}
