import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { DriverLocationService } from './driverLocation.service';
import { JwtAuthGuard, RolesGuard, Role, CurrentUser, User, SetRolesMetaData } from '@urcab-workspace/shared';
import {
  DriverLocationResponseDto,
  NearbyDriverResponseDto,
  UpdateDriverLocationDto,
  UpdateDriverStatusDto,
} from './dto';

@ApiTags('Driver Location')
@Controller('driver/location')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DriverLocationController {
  constructor(private readonly driverLocationService: DriverLocationService) {}

  @Post('update')
  @ApiOperation({ summary: 'Update driver location and status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Driver location updated successfully',
    type: DriverLocationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid location data',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Driver not authenticated',
  })
  @HttpCode(HttpStatus.OK)
  @SetRolesMetaData(Role.DRIVER)
  async updateLocation(
    @Body() updateLocationDto: UpdateDriverLocationDto,
    @CurrentUser() user: User,
  ): Promise<DriverLocationResponseDto> {
    const driverId = new Types.ObjectId(user._id);
    return await this.driverLocationService.updateDriverLocation(driverId, updateLocationDto);
  }

  @Put('status')
  @ApiOperation({ summary: 'Update driver status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Driver status updated successfully',
    type: DriverLocationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid status data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Driver location not found',
  })
  @SetRolesMetaData(Role.DRIVER)
  async updateStatus(
    @Body() updateStatusDto: UpdateDriverStatusDto,
    @CurrentUser() user: User,
  ): Promise<DriverLocationResponseDto> {
    const driverId = new Types.ObjectId(user._id);
    return await this.driverLocationService.updateDriverStatus(driverId, updateStatusDto);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current driver location' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Driver location retrieved successfully',
    type: DriverLocationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Driver location not found',
  })
  async getCurrentLocation(@CurrentUser() user: User): Promise<DriverLocationResponseDto> {
    const driverId = new Types.ObjectId(user._id);
    return await this.driverLocationService.getDriverLocation(driverId);
  }

  @Post('go-online')
  @ApiOperation({ summary: 'Set driver status to online and available' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Driver is now online and available',
    type: DriverLocationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Failed to set driver online',
  })
  @HttpCode(HttpStatus.OK)
  @SetRolesMetaData(Role.DRIVER)
  async goOnline(@CurrentUser() user: User): Promise<DriverLocationResponseDto> {
    const driverId = new Types.ObjectId(user._id);
    return await this.driverLocationService.setDriverAvailability(driverId, true);
  }

  @Post('go-offline')
  @ApiOperation({ summary: 'Set driver status to offline' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Driver is now offline',
    type: DriverLocationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Failed to set driver offline',
  })
  @HttpCode(HttpStatus.OK)
  @SetRolesMetaData(Role.DRIVER)
  async goOffline(@CurrentUser() user: User): Promise<DriverLocationResponseDto> {
    const driverId = new Types.ObjectId(user._id);
    return await this.driverLocationService.goOffline(driverId);
  }

  @Post('set-busy')
  @ApiOperation({ summary: 'Set driver as busy (unavailable for new rides)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Driver is now busy',
    type: DriverLocationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Failed to set driver as busy',
  })
  @HttpCode(HttpStatus.OK)
  @SetRolesMetaData(Role.DRIVER)
  async setBusy(@CurrentUser() user: User): Promise<DriverLocationResponseDto> {
    const driverId = new Types.ObjectId(user._id);
    return await this.driverLocationService.setDriverAvailability(driverId, false);
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Find nearby available drivers (for testing purposes)' })
  @ApiQuery({
    name: 'latitude',
    description: 'Center latitude',
    required: true,
    type: 'number',
  })
  @ApiQuery({
    name: 'longitude',
    description: 'Center longitude',
    required: true,
    type: 'number',
  })
  @ApiQuery({
    name: 'radius',
    description: 'Search radius in kilometers',
    required: false,
    type: 'number',
    example: 10,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of drivers to return',
    required: false,
    type: 'number',
    example: 20,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Nearby drivers retrieved successfully',
    type: [NearbyDriverResponseDto],
  })
  @SetRolesMetaData(Role.DRIVER)
  async findNearbyDrivers(
    @Query('latitude', ParseIntPipe) latitude: number,
    @Query('longitude', ParseIntPipe) longitude: number,
    @Query('radius', new ParseIntPipe({ optional: true })) radius: number = 10,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
  ): Promise<NearbyDriverResponseDto[]> {
    if (latitude < -90 || latitude > 90) {
      throw new BadRequestException('Latitude must be between -90 and 90');
    }
    if (longitude < -180 || longitude > 180) {
      throw new BadRequestException('Longitude must be between -180 and 180');
    }
    if (radius < 1 || radius > 50) {
      throw new BadRequestException('Radius must be between 1 and 50 km');
    }
    if (limit < 1 || limit > 100) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    return await this.driverLocationService.findNearbyDrivers(longitude, latitude, radius, limit);
  }

  @Get('online-count')
  @ApiOperation({ summary: 'Get count of online drivers' })
  @ApiQuery({
    name: 'latitude',
    description: 'Center latitude (optional)',
    required: false,
    type: 'number',
  })
  @ApiQuery({
    name: 'longitude',
    description: 'Center longitude (optional)',
    required: false,
    type: 'number',
  })
  @ApiQuery({
    name: 'radius',
    description: 'Search radius in kilometers (optional)',
    required: false,
    type: 'number',
    example: 10,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Online drivers count retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number' },
      },
    },
  })
  @SetRolesMetaData(Role.DRIVER)
  async getOnlineDriversCount(
    @Query('latitude', new ParseIntPipe({ optional: true })) latitude?: number,
    @Query('longitude', new ParseIntPipe({ optional: true })) longitude?: number,
    @Query('radius', new ParseIntPipe({ optional: true })) radius?: number,
  ): Promise<{ count: number }> {
    return await this.driverLocationService.getOnlineDriversCount(radius, longitude, latitude);
  }
}
