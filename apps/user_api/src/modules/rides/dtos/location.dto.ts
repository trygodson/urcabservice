import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Min, Max, IsString, IsNotEmpty, IsOptional, MaxLength, ValidateNested } from 'class-validator';

export class CoordinatesDto {
  @ApiProperty({
    example: 101.6869,
    description: 'Longitude coordinate',
    minimum: -180,
    maximum: 180,
  })
  @IsNumber({}, { message: 'Longitude must be a valid number' })
  @Min(-180, { message: 'Longitude must be at least -180' })
  @Max(180, { message: 'Longitude must be at most 180' })
  longitude: number;

  @ApiProperty({
    example: 3.139,
    description: 'Latitude coordinate',
    minimum: -90,
    maximum: 90,
  })
  @IsNumber({}, { message: 'Latitude must be a valid number' })
  @Min(-90, { message: 'Latitude must be at least -90' })
  @Max(90, { message: 'Latitude must be at most 90' })
  latitude: number;
}

export class AddressDto {
  @ApiProperty({
    example: '123 Jalan Bukit Bintang, Kuala Lumpur, Malaysia',
    description: 'Complete formatted address',
  })
  @IsString({ message: 'Formatted address must be a string' })
  @IsNotEmpty({ message: 'Formatted address is required' })
  @MaxLength(500, { message: 'Formatted address must not exceed 500 characters' })
  formatted: string;

  @ApiProperty({
    example: '123 Jalan Bukit Bintang',
    description: 'Street address',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Street must be a string' })
  @MaxLength(200, { message: 'Street must not exceed 200 characters' })
  street?: string;

  // @ApiProperty({
  //   example: 'Kuala Lumpur',
  //   description: 'City name',
  //   required: false,
  // })
  // @IsOptional()
  // @IsString({ message: 'City must be a string' })
  // @MaxLength(100, { message: 'City must not exceed 100 characters' })
  // city?: string;

  // @ApiProperty({
  //   example: 'Selangor',
  //   description: 'State or province',
  //   required: false,
  // })
  // @IsOptional()
  // @IsString({ message: 'State must be a string' })
  // @MaxLength(100, { message: 'State must not exceed 100 characters' })
  // state?: string;

  // @ApiProperty({
  //   example: '50200',
  //   description: 'Postal code',
  //   required: false,
  // })
  // @IsOptional()
  // @IsString({ message: 'Postal code must be a string' })
  // @MaxLength(20, { message: 'Postal code must not exceed 20 characters' })
  // postalCode?: string;

  // @ApiProperty({
  //   example: 'Malaysia',
  //   description: 'Country name',
  //   required: false,
  // })
  // @IsOptional()
  // @IsString({ message: 'Country must be a string' })
  // @MaxLength(100, { message: 'Country must not exceed 100 characters' })
  // country?: string;
}

export class LocationDto {
  @ApiProperty({
    description: 'Geographic coordinates of the location',
    type: CoordinatesDto,
  })
  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates: CoordinatesDto;

  // @ApiProperty({
  //   description: 'Address information for the location',
  //   type: AddressDto,
  // })
  // @ValidateNested()
  // @Type(() => AddressDto)
  // address: AddressDto;

  @ApiPropertyOptional({
    example: '123 Jalan Bukit Bintang, Kuala Lumpur, Malaysia',
    description: 'Complete formatted address',
  })
  @IsString({ message: 'Formatted address must be a string' })
  @IsOptional()
  @MaxLength(500, { message: 'Formatted address must not exceed 500 characters' })
  address: string;

  @ApiProperty({
    example: 'ChIJr8_eiQ8zMw4RpWLeMpGT6xo',
    description: 'Google Places Place ID for accurate location reference',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Place ID must be a string' })
  @MaxLength(200, { message: 'Place ID must not exceed 200 characters' })
  placeId?: string;

  // @ApiProperty({
  //   example: 'Near KLCC Tower',
  //   description: 'Notable landmark near the location',
  //   required: false,
  // })
  // @IsOptional()
  // @IsString({ message: 'Landmark must be a string' })
  // @MaxLength(200, { message: 'Landmark must not exceed 200 characters' })
  // landmark?: string;
}
