import { ApiProperty } from '@nestjs/swagger';

/**
 * Interface for Mapbox Geocoding API response feature
 */
export class MapboxFeature {
  @ApiProperty({ description: 'Unique feature ID' })
  id: string;

  @ApiProperty({ description: 'Feature type (always "Feature")' })
  type: string;

  @ApiProperty({ description: 'Location names and details' })
  place_name: string;

  @ApiProperty({ description: 'Place type categories', isArray: true })
  place_type: string[];

  @ApiProperty({ description: 'Relevant location properties' })
  properties: {
    [key: string]: any;
  };

  @ApiProperty({ description: 'Geographic data' })
  geometry: {
    type: string;
    coordinates: number[]; // [longitude, latitude]
  };

  @ApiProperty({ description: 'Alternative name values', isArray: true })
  matching_text?: string[];

  @ApiProperty({ description: 'Place name in the language of the request' })
  text: string;
}

/**
 * Response DTO for location search results
 */
export class LocationSearchResponseDto {
  @ApiProperty({ description: 'Whether the search was successful' })
  success: boolean;

  @ApiProperty({ description: 'Array of location suggestions', type: [MapboxFeature] })
  results: MapboxFeature[];
}

/**
 * Query parameters for location search
 */
export class LocationSearchQueryDto {
  @ApiProperty({ description: 'Search text for location', required: true })
  query: string;

  @ApiProperty({ description: 'Country code to limit results (e.g. ng)', required: false })
  country?: string;

  @ApiProperty({ description: 'Maximum number of results to return', required: false, default: 7 })
  limit?: number;
}
