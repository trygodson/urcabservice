import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseFloatPipe,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard, Role, RolesGuard, SetRolesMetaData, User } from '@urcab-workspace/shared';
import { RideResponseDto } from 'apps/user_api/src/modules/rides/dtos';
import { CompleteRideDto, DriverRideService, NearbyRideRequestDto } from './driverRide.service';
import { Types } from 'mongoose';

@ApiTags('Driver Rides')
@Controller('driver/rides')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DriverRideController {
  constructor(private readonly driverRidesService: DriverRideService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get current active ride for driver' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Current ride retrieved successfully (null if no active ride)',
    type: RideResponseDto,
  })
  @SetRolesMetaData(Role.DRIVER)
  async getCurrentRide(@CurrentUser() user: User) {
    const driverId = new Types.ObjectId(user._id);
    return await this.driverRidesService.getCurrentRide(driverId);
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Accept a ride request (Driver only)' })
  @ApiParam({
    name: 'id',
    description: 'Ride ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ride accepted successfully',
    type: RideResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ride not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Ride cannot be accepted',
  })
  @SetRolesMetaData(Role.DRIVER)
  async acceptRide(@Param('id') rideId: string, @CurrentUser() user: any) {
    return await this.driverRidesService.acceptRide(rideId, user?._id);
  }

  @Get('nearby/requests')
  @ApiOperation({ summary: 'Get nearby ride requests for driver' })
  @ApiQuery({
    name: 'latitude',
    description: 'Driver current latitude',
    required: true,
    type: 'number',
    example: 3.139003,
  })
  @ApiQuery({
    name: 'longitude',
    description: 'Driver current longitude',
    required: true,
    type: 'number',
    example: 101.686855,
  })
  @ApiQuery({
    name: 'radius',
    description: 'Search radius in kilometers',
    required: false,
    type: 'number',
    example: 10,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Nearby ride requests retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          passengerId: { type: 'string' },
          passengerName: { type: 'string' },
          passengerPhone: { type: 'string' },
          passengerPhoto: { type: 'string' },
          passengerRating: { type: 'number' },
          pickupLocation: {
            type: 'object',
            properties: {
              address: { type: 'string' },
              coordinates: { type: 'array', items: { type: 'number' } },
              landmark: { type: 'string' },
            },
          },
          dropoffLocation: {
            type: 'object',
            properties: {
              address: { type: 'string' },
              coordinates: { type: 'array', items: { type: 'number' } },
              landmark: { type: 'string' },
            },
          },
          estimatedFare: { type: 'number' },
          estimatedDistance: { type: 'number' },
          estimatedDuration: { type: 'number' },
          distanceToPickup: { type: 'number' },
          estimatedArrivalTime: { type: 'number' },
          rideType: { type: 'string' },
          passengerCount: { type: 'number' },
          specialRequests: { type: 'string' },
          timeElapsed: { type: 'number' },
        },
      },
    },
  })
  @SetRolesMetaData(Role.DRIVER)
  async getNearbyRideRequests(
    @Query('latitude', ParseFloatPipe) latitude: number,
    @Query('longitude', ParseFloatPipe) longitude: number,
    @Query('radius', new ParseFloatPipe({ optional: true })) radius: number = 10,
    @CurrentUser() user: User,
  ): Promise<NearbyRideRequestDto[]> {
    // Validate coordinates
    if (latitude < -90 || latitude > 90) {
      throw new BadRequestException('Latitude must be between -90 and 90 degrees');
    }
    if (longitude < -180 || longitude > 180) {
      throw new BadRequestException('Longitude must be between -180 and 180 degrees');
    }
    if (radius <= 0 || radius > 50) {
      throw new BadRequestException('Radius must be between 0.1 and 50 kilometers');
    }

    const driverId = new Types.ObjectId(user._id);
    return await this.driverRidesService.getNearbyRideRequests(driverId, longitude, latitude, radius);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start a ride (Driver only)' })
  @ApiParam({
    name: 'id',
    description: 'Ride ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ride started successfully',
    type: RideResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ride not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Ride cannot be started',
  })
  @SetRolesMetaData(Role.DRIVER)
  async startRide(@Param('id') rideId: string, @CurrentUser() user: User) {
    if (!Types.ObjectId.isValid(rideId)) {
      throw new BadRequestException('Invalid ride ID format');
    }

    const driverId = new Types.ObjectId(user._id);
    return await this.driverRidesService.startRide(rideId, driverId);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete a ride (Driver only)' })
  @ApiParam({
    name: 'id',
    description: 'Ride ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ride completed successfully',
    type: RideResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ride not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Ride cannot be completed',
  })
  @SetRolesMetaData(Role.DRIVER)
  async completeRide(@Param('id') rideId: string, @Body() completeData: CompleteRideDto, @CurrentUser() user: User) {
    if (!Types.ObjectId.isValid(rideId)) {
      throw new BadRequestException('Invalid ride ID format');
    }

    const driverId = new Types.ObjectId(user._id);
    return await this.driverRidesService.completeRide(rideId, driverId, completeData);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a ride (Driver only)' })
  @ApiParam({
    name: 'id',
    description: 'Ride ID',
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
  @SetRolesMetaData(Role.DRIVER)
  async cancelRide(@Param('id') rideId: string, @Body() body: { reason?: string }, @CurrentUser() user: User) {
    if (!Types.ObjectId.isValid(rideId)) {
      throw new BadRequestException('Invalid ride ID format');
    }

    const driverId = new Types.ObjectId(user._id);
    return await this.driverRidesService.cancelRide(rideId, driverId, body.reason);
  }

  @Post(':id/arrivedAtPassengerLocation')
  @ApiOperation({ summary: 'Mark driver as arrived at pickup location' })
  @ApiParam({
    name: 'id',
    description: 'Ride ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Arrival status updated successfully',
    type: RideResponseDto,
  })
  @SetRolesMetaData(Role.DRIVER)
  async markAsArrived(@Param('id') rideId: string, @CurrentUser() user: User) {
    if (!Types.ObjectId.isValid(rideId)) {
      throw new BadRequestException('Invalid ride ID format');
    }

    const driverId = new Types.ObjectId(user._id);
    return await this.driverRidesService.driverAtPickupLocationRide(rideId, driverId);
  }
  @Post(':id/pickedUpPassenger')
  @ApiOperation({ summary: 'Mark driver as arrived at pickup location' })
  @ApiParam({
    name: 'id',
    description: 'Ride ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Arrival status updated successfully',
    type: RideResponseDto,
  })
  @SetRolesMetaData(Role.DRIVER)
  async pickedUpPassenger(@Param('id') rideId: string, @CurrentUser() user: User) {
    if (!Types.ObjectId.isValid(rideId)) {
      throw new BadRequestException('Invalid ride ID format');
    }

    const driverId = new Types.ObjectId(user._id);
    return await this.driverRidesService.updateDriverArrivalPickUpPassengerStatus(rideId, driverId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get driver ride history' })
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
    description: 'Driver ride history retrieved successfully',
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
        totalPages: { type: 'number' },
        stats: {
          type: 'object',
          properties: {
            totalRides: { type: 'number' },
            completedRides: { type: 'number' },
            cancelledRides: { type: 'number' },
            totalEarnings: { type: 'number' },
            averageRating: { type: 'number' },
          },
        },
      },
    },
  })
  @SetRolesMetaData(Role.DRIVER)
  async getDriverRideHistory(
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
    @CurrentUser() user: User,
  ) {
    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 10;

    const driverId = new Types.ObjectId(user._id);
    return await this.driverRidesService.getDriverRideHistory(driverId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ride details by ID (Driver only)' })
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
  @SetRolesMetaData(Role.DRIVER)
  async getRideById(@Param('id') rideId: string, @CurrentUser() user: User) {
    if (!Types.ObjectId.isValid(rideId)) {
      throw new BadRequestException('Invalid ride ID format');
    }

    const driverId = new Types.ObjectId(user._id);
    return await this.driverRidesService.getRideById(rideId, driverId);
  }
}
