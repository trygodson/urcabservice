import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  ParseIntPipe,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RidesService } from './rides.service';
import { CreateRideDto, UpdateRideDto, RideResponseDto } from './dtos';
import { JwtAuthGuard, RolesGuard, Role, CurrentUser, User, SetRolesMetaData } from '@urcab-workspace/shared';

@ApiTags('Rides')
@Controller('rides')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RidesController {
  constructor(private readonly ridesService: RidesService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get current active ride for passenger' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Current ride retrieved successfully (null if no active ride)',
    type: RideResponseDto,
  })
  @SetRolesMetaData(Role.PASSENGER)
  async getCurrentRide(@CurrentUser() user: User) {
    console.log(user, '====current user===');
    return await this.ridesService.getPassengerCurrentRide(user._id);
  }

  @Get('passenger/history')
  @ApiOperation({ summary: 'Get passenger ride history' })
  @ApiQuery({
    name: 'page',
    description: 'Page number',
    required: false,
    type: 'number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of items per page',
    required: false,
    type: 'number',
    example: 10,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Passenger ride history retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        rides: {
          type: 'array',
          items: { $ref: '#/components/schemas/RideResponseDto' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  @SetRolesMetaData(Role.PASSENGER)
  async getPassengerRideHistory(
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
    @CurrentUser() user: User,
  ): Promise<{
    rides: RideResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 10;

    const passengerId = new Types.ObjectId(user._id);

    console.log(user);
    return await this.ridesService.getPassengerRideHistory(passengerId, page, limit);
  }

  @Get('drivers/nearby')
  @ApiOperation({ summary: 'Get nearby available drivers' })
  @ApiQuery({
    name: 'latitude',
    description: 'Passenger latitude',
    required: true,
    type: 'number',
  })
  @ApiQuery({
    name: 'longitude',
    description: 'Passenger longitude',
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
  @SetRolesMetaData(Role.PASSENGER)

  // @ApiResponse({
  //   status: HttpStatus.OK,
  //   description: 'Nearby drivers retrieved successfully',
  //   type: [DriverLocationResponseDto],
  // })
  async getNearbyDrivers(
    @Query('latitude') latitude: number,
    @Query('longitude') longitude: number,
    @Query('radius', new ParseIntPipe({ optional: true })) radius: number = 10,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
    @Query('passenger', new ParseIntPipe({ optional: true })) passenger: number = 4,
  ) {
    // console.log(longitude, latitude, radius, '=====');
    // Validate coordinates
    if (latitude < -90 || latitude > 90) {
      throw new BadRequestException('Latitude must be between -90 and 90 degrees');
    }

    if (longitude < -180 || longitude > 180) {
      throw new BadRequestException('Longitude must be between -180 and 180 degrees');
    }

    if (radius <= 0 || radius > 100) {
      throw new BadRequestException('Radius must be between 0.1 and 100 kilometers');
    }

    if (limit <= 0 || limit > 100) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    return await this.ridesService.findNearbyDrivers(longitude, latitude, radius, 20, passenger);
  }

  @Post()
  @ApiOperation({ summary: 'Book a new ride' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Ride booked successfully',
    type: RideResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid booking data or validation error',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  @HttpCode(HttpStatus.CREATED)
  @SetRolesMetaData(Role.PASSENGER)
  async bookRide(@Body() createRideDto: CreateRideDto, @CurrentUser() user: User): Promise<RideResponseDto> {
    const passengerId = new Types.ObjectId(user._id);
    return await this.ridesService.bookRide(passengerId, createRideDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ride details by ID' })
  @ApiParam({
    name: 'id',
    description: 'Ride ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ride details retrieved successfully',
    type: RideResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ride not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied to this ride',
  })
  @SetRolesMetaData(Role.PASSENGER)
  async getRideById(@Param('id') rideId: string, @CurrentUser() user: User): Promise<RideResponseDto> {
    if (!Types.ObjectId.isValid(rideId)) {
      throw new BadRequestException('Invalid ride ID format');
    }

    const userId = new Types.ObjectId(user._id);
    return await this.ridesService.getRideById(rideId, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update ride details' })
  @ApiParam({
    name: 'id',
    description: 'Ride ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ride updated successfully',
    type: RideResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ride not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid update data or status transition',
  })
  @SetRolesMetaData(Role.PASSENGER)
  async updateRide(
    @Param('id') rideId: string,
    @Body() updateRideDto: UpdateRideDto,
    @CurrentUser() user: User,
  ): Promise<RideResponseDto> {
    if (!Types.ObjectId.isValid(rideId)) {
      throw new BadRequestException('Invalid ride ID format');
    }

    const userId = new Types.ObjectId(user._id);
    return await this.ridesService.updateRide(rideId, updateRideDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel a ride' })
  @ApiParam({
    name: 'id',
    description: 'Ride ID',
    type: 'string',
  })
  @ApiQuery({
    name: 'reason',
    description: 'Cancellation reason',
    required: false,
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ride cancelled successfully',
    type: RideResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ride not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Ride cannot be cancelled',
  })
  @SetRolesMetaData(Role.PASSENGER)
  async cancelRide(
    @Param('id') rideId: string,
    @CurrentUser() user: User,
    @Query('reason') reason?: string,
  ): Promise<RideResponseDto> {
    if (!Types.ObjectId.isValid(rideId)) {
      throw new BadRequestException('Invalid ride ID format');
    }

    const userId = new Types.ObjectId(user._id);
    return await this.ridesService.cancelRide(rideId, userId, reason);
  }

  // @Get('passenger/active')
  // @ApiOperation({ summary: 'Get active ride for passenger' })
  // @ApiResponse({
  //   status: HttpStatus.OK,
  //   description: 'Active ride retrieved successfully',
  //   type: RideResponseDto,
  // })
  // @ApiResponse({
  //   status: HttpStatus.NOT_FOUND,
  //   description: 'No active ride found',
  // })
  // async getActivePassengerRide(
  //   @CurrentUser() user: User,
  // ): Promise<RideResponseDto | null> {
  //   const passengerId = new Types.ObjectId(user._id);
  //   return await this.ridesService.getActivePassengerRide(passengerId);
  // }

  // @Get('driver/active')
  // @ApiOperation({ summary: 'Get active ride for driver' })
  // @ApiResponse({
  //   status: HttpStatus.OK,
  //   description: 'Active ride retrieved successfully',
  //   type: RideResponseDto,
  // })
  // @ApiResponse({
  //   status: HttpStatus.NOT_FOUND,
  //   description: 'No active ride found',
  // })
  // @SetRolesMetaData(Role.DRIVER)
  // @UseGuards(RolesGuard)
  // async getActiveDriverRide(
  //   @CurrentUser() user: User,
  // ): Promise<RideResponseDto | null> {
  //   const driverId = new Types.ObjectId(user._id);
  //   return await this.ridesService.getActiveDriverRide(driverId);
  // }

  // @Get('admin/statistics')
  // @ApiOperation({ summary: 'Get ride statistics (Admin only)' })
  // @ApiQuery({
  //   name: 'startDate',
  //   description: 'Start date for statistics',
  //   required: false,
  //   type: 'string',
  //   example: '2024-01-01',
  // })
  // @ApiQuery({
  //   name: 'endDate',
  //   description: 'End date for statistics',
  //   required: false,
  //   type: 'string',
  //   example: '2024-12-31',
  // })
  // @ApiResponse({
  //   status: HttpStatus.OK,
  //   description: 'Ride statistics retrieved successfully',
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       totalRides: { type: 'number' },
  //       completedRides: { type: 'number' },
  //       cancelledRides: { type: 'number' },
  //       totalRevenue: { type: 'number' },
  //       averageFare: { type: 'number' },
  //     },
  //   },
  // })
  // @SetRolesMetaData(Role.ADMIN)
  // @UseGuards(RolesGuard)
  // async getRideStatistics(
  //   @Query('startDate') startDate?: string,
  //   @Query('endDate') endDate?: string,
  // ): Promise<{
  //   totalRides: number;
  //   completedRides: number;
  //   cancelledRides: number;
  //   totalRevenue: number;
  //   averageFare: number;
  // }> {
  //   const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  //   const end = endDate ? new Date(endDate) : new Date();

  //   return await this.ridesService.getRideStatistics(start, end);
  // }
}
