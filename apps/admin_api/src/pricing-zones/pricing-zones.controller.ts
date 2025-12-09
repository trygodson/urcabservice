import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { CurrentUser, JwtAdminAuthGuard, Role, SetRolesMetaData } from '@urcab-workspace/shared';
import { PricingZonesService } from './pricing-zones.service';
import {
  CreatePricingZoneDto,
  UpdatePricingZoneDto,
  QueryPricingZoneDto,
  LocationSearchResponseDto,
  LocationSearchQueryDto,
} from './dto';

@ApiTags('Admin - Pricing Zones')
@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard)
@Controller('admin/pricing-zones')
export class PricingZonesController {
  constructor(private readonly pricingZonesService: PricingZonesService) {}

  @Post()
  @SetRolesMetaData(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new pricing zone' })
  @ApiResponse({ status: 201, description: 'Pricing zone created successfully' })
  async create(@Body() createPricingZoneDto: CreatePricingZoneDto, @CurrentUser() user: any) {
    return this.pricingZonesService.create(createPricingZoneDto, user.sub);
  }

  @Get()
  @SetRolesMetaData(Role.ADMIN)
  @ApiOperation({ summary: 'Get all pricing zones with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'longitude', required: false, type: Number })
  @ApiQuery({ name: 'latitude', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Pricing zones retrieved successfully' })
  async findAll(@Query() query: QueryPricingZoneDto) {
    return this.pricingZonesService.findAll(query);
  }

  @Get('check-location')
  @SetRolesMetaData(Role.ADMIN)
  @ApiOperation({ summary: 'Check if a location is within a pricing zone' })
  @ApiQuery({ name: 'longitude', required: true, type: Number })
  @ApiQuery({ name: 'latitude', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Location checked successfully' })
  async checkLocation(@Query('longitude') longitude: number, @Query('latitude') latitude: number) {
    return this.pricingZonesService.checkLocationZone(longitude, latitude);
  }

  @Get(':id')
  @SetRolesMetaData(Role.ADMIN)
  @ApiOperation({ summary: 'Get a pricing zone by ID' })
  @ApiParam({ name: 'id', description: 'Pricing Zone ID' })
  @ApiResponse({ status: 200, description: 'Pricing zone retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Pricing zone not found' })
  async findOne(@Param('id') id: string) {
    return this.pricingZonesService.findOne(id);
  }

  @Patch(':id')
  @SetRolesMetaData(Role.ADMIN)
  @ApiOperation({ summary: 'Update a pricing zone' })
  @ApiParam({ name: 'id', description: 'Pricing Zone ID' })
  @ApiResponse({ status: 200, description: 'Pricing zone updated successfully' })
  @ApiResponse({ status: 404, description: 'Pricing zone not found' })
  async update(@Param('id') id: string, @Body() updatePricingZoneDto: UpdatePricingZoneDto, @CurrentUser() user: any) {
    return this.pricingZonesService.update(id, updatePricingZoneDto, user.sub);
  }

  @Delete(':id')
  @SetRolesMetaData(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a pricing zone' })
  @ApiParam({ name: 'id', description: 'Pricing Zone ID' })
  @ApiResponse({ status: 200, description: 'Pricing zone deleted successfully' })
  @ApiResponse({ status: 404, description: 'Pricing zone not found' })
  async remove(@Param('id') id: string) {
    return this.pricingZonesService.remove(id);
  }

  @Get('search/locations')
  @SetRolesMetaData(Role.ADMIN)
  @ApiOperation({ summary: 'Search for locations using Mapbox Geocoding API' })
  @ApiQuery({ name: 'query', required: true, description: 'Search text for location' })
  @ApiQuery({ name: 'country', required: false, description: 'Country code to limit results (e.g. ng)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of results to return', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Location search results',
    type: LocationSearchResponseDto,
  })
  @ApiResponse({ status: 500, description: 'Server error or Mapbox API error' })
  async searchLocations(
    @Query('query') searchText: string,
    @Query('country') countryCode?: string,
    @Query('limit') limit?: number,
  ) {
    return this.pricingZonesService.searchLocations(
      searchText,
      countryCode,
      limit ? parseInt(limit.toString()) : undefined,
    );
  }
}
