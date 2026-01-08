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
  ParseFloatPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RidesService } from './rides.service';
import { CreateRideDto, UpdateRideDto, RideResponseDto, VehiclePriceListResponseDto, AddTipDto } from './dtos';
import { JwtAuthGuard, RolesGuard, Role, CurrentUser, User, SetRolesMetaData } from '@urcab-workspace/shared';

@ApiTags('Rides')
@Controller('rides')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RidesController {
  constructor(private readonly ridesService: RidesService) {}

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

  @Get('current')
  @ApiOperation({ summary: 'Get current active ride for passenger' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Current ride retrieved successfully (null if no active ride)',
    type: RideResponseDto,
  })
  @SetRolesMetaData(Role.PASSENGER)
  async getCurrentRide(@CurrentUser() user: User) {
    // console.log(user, '====current user===');
    return await this.ridesService.getPassengerCurrentRide(user._id);
  }

  // Add this endpoint to apps/user_api/src/modules/rides/rides.controller.ts

  @Get('vehicles/prices')
  @ApiOperation({ summary: 'Get vehicle types with prices based on capacity, distance and locations' })
  @ApiQuery({
    name: 'seatingCapacity',
    description: 'Required passenger seating capacity',
    required: true,
    type: 'number',
    example: 4,
  })
  @ApiQuery({
    name: 'distance',
    description: 'Ride distance in kilometers',
    required: true,
    type: 'number',
    example: 10.5,
  })
  @ApiQuery({
    name: 'pickupLongitude',
    description: 'Pickup location longitude',
    required: false,
    type: 'number',
    example: 101.7152,
  })
  @ApiQuery({
    name: 'pickupLatitude',
    description: 'Pickup location latitude',
    required: false,
    type: 'number',
    example: 3.1548,
  })
  @ApiQuery({
    name: 'dropoffLongitude',
    description: 'Dropoff location longitude',
    required: false,
    type: 'number',
    example: 101.6865,
  })
  @ApiQuery({
    name: 'dropoffLatitude',
    description: 'Dropoff location latitude',
    required: false,
    type: 'number',
    example: 3.1421,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vehicle prices retrieved successfully',
    type: VehiclePriceListResponseDto,
  })
  @SetRolesMetaData(Role.PASSENGER)
  async getVehiclePrices(
    @Query('seatingCapacity', new ParseIntPipe()) seatingCapacity: number,
    @Query('distance', new ParseFloatPipe()) distance: number,
    @Query('pickupLongitude', new ParseFloatPipe({ optional: true })) pickupLongitude?: number,
    @Query('pickupLatitude', new ParseFloatPipe({ optional: true })) pickupLatitude?: number,
    @Query('dropoffLongitude', new ParseFloatPipe({ optional: true })) dropoffLongitude?: number,
    @Query('dropoffLatitude', new ParseFloatPipe({ optional: true })) dropoffLatitude?: number,
  ) {
    if (seatingCapacity < 1) {
      throw new BadRequestException('Seating capacity must be at least 1');
    }

    if (distance <= 0) {
      throw new BadRequestException('Distance must be greater than 0');
    }

    // Create location objects if coordinates are provided
    let pickupLocation;
    let dropoffLocation;

    if (pickupLongitude !== undefined && pickupLatitude !== undefined) {
      pickupLocation = { longitude: pickupLongitude, latitude: pickupLatitude };
    }

    if (dropoffLongitude !== undefined && dropoffLatitude !== undefined) {
      dropoffLocation = { longitude: dropoffLongitude, latitude: dropoffLatitude };
    }

    const vehicles = await this.ridesService.getVehiclesByCapacityAndPrice(
      seatingCapacity,
      distance,
      pickupLocation,
      dropoffLocation,
    );

    return vehicles;
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

  @Post(':id/transaction')
  @ApiOperation({ summary: 'Get wallet transaction for a ride and optionally add tip to update total amount' })
  @ApiParam({
    name: 'id',
    description: 'Ride ID',
    type: 'string',
  })
  @ApiBody({ type: AddTipDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transaction retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ride or transaction not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Access denied to this ride transaction',
  })
  @SetRolesMetaData(Role.PASSENGER)
  async getRideTransaction(@Param('id') rideId: string, @Body() body: AddTipDto, @CurrentUser() user: User) {
    if (!Types.ObjectId.isValid(rideId)) {
      throw new BadRequestException('Invalid ride ID format');
    }

    if (body.tip !== undefined && (typeof body.tip !== 'number' || body.tip < 0)) {
      throw new BadRequestException('Tip must be a non-negative number');
    }

    const userId = new Types.ObjectId(user._id);
    return await this.ridesService.getRideTransaction(rideId, userId, body.tip);
  }

  @Post(':id/confirm-payment')
  @ApiOperation({ summary: 'Confirm payment for a ride (passenger confirms payment completion)' })
  @ApiParam({
    name: 'id',
    description: 'Ride ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment confirmed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Payment confirmed successfully' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ride or transaction not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Payment already confirmed or access denied',
  })
  @SetRolesMetaData(Role.PASSENGER)
  async confirmPayment(@Param('id') rideId: string, @CurrentUser() user: User) {
    if (!Types.ObjectId.isValid(rideId)) {
      throw new BadRequestException('Invalid ride ID format');
    }

    const userId = new Types.ObjectId(user._id);
    return await this.ridesService.confirmPayment(rideId, userId);
  }

  @Get(':id/driver-location')
  @ApiOperation({ summary: 'Get ride driver location by ID' })
  @SetRolesMetaData(Role.PASSENGER)
  async getRideByIdDriverLocation(@Param('id') rideId: string, @CurrentUser() user: User): Promise<RideResponseDto> {
    if (!Types.ObjectId.isValid(rideId)) {
      throw new BadRequestException('Invalid ride ID format');
    }

    const userId = new Types.ObjectId(user._id);
    return await this.ridesService.getRideByIdDriverLocation(rideId, userId);
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

  // @Get('vehicles/prices/test-time')
  // @ApiOperation({ summary: 'Test vehicle prices with specific time of day and locations' })
  // @ApiQuery({
  //   name: 'seatingCapacity',
  //   description: 'Required passenger seating capacity',
  //   required: true,
  //   type: 'number',
  //   example: 4,
  // })
  // @ApiQuery({
  //   name: 'distance',
  //   description: 'Ride distance in kilometers',
  //   required: true,
  //   type: 'number',
  //   example: 10.5,
  // })
  // @ApiQuery({
  //   name: 'time',
  //   description: 'Time of day in HH:MM format to simulate',
  //   required: true,
  //   type: 'string',
  //   example: '22:30',
  // })
  // @ApiQuery({
  //   name: 'pickupLongitude',
  //   description: 'Pickup location longitude',
  //   required: false,
  //   type: 'number',
  //   example: 101.7152,
  // })
  // @ApiQuery({
  //   name: 'pickupLatitude',
  //   description: 'Pickup location latitude',
  //   required: false,
  //   type: 'number',
  //   example: 3.1548,
  // })
  // @ApiQuery({
  //   name: 'dropoffLongitude',
  //   description: 'Dropoff location longitude',
  //   required: false,
  //   type: 'number',
  //   example: 101.6865,
  // })
  // @ApiQuery({
  //   name: 'dropoffLatitude',
  //   description: 'Dropoff location latitude',
  //   required: false,
  //   type: 'number',
  //   example: 3.1421,
  // })
  // @ApiResponse({
  //   status: HttpStatus.OK,
  //   description: 'Vehicle prices retrieved successfully',
  //   type: VehiclePriceListResponseDto,
  // })
  // @SetRolesMetaData(Role.PASSENGER)
  // async testTimePrices(
  //   @Query('seatingCapacity', new ParseIntPipe()) seatingCapacity: number,
  //   @Query('distance', new ParseFloatPipe()) distance: number,
  //   @Query('time') timeString: string,
  //   @Query('pickupLongitude', new ParseFloatPipe({ optional: true })) pickupLongitude?: number,
  //   @Query('pickupLatitude', new ParseFloatPipe({ optional: true })) pickupLatitude?: number,
  //   @Query('dropoffLongitude', new ParseFloatPipe({ optional: true })) dropoffLongitude?: number,
  //   @Query('dropoffLatitude', new ParseFloatPipe({ optional: true })) dropoffLatitude?: number,
  // ) {
  //   if (seatingCapacity < 1) {
  //     throw new BadRequestException('Seating capacity must be at least 1');
  //   }

  //   if (distance <= 0) {
  //     throw new BadRequestException('Distance must be greater than 0');
  //   }

  //   // Validate time format
  //   if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeString)) {
  //     throw new BadRequestException('Time must be in HH:MM format (24-hour)');
  //   }

  //   // Create location objects if coordinates are provided
  //   let pickupLocation;
  //   let dropoffLocation;

  //   if (pickupLongitude !== undefined && pickupLatitude !== undefined) {
  //     pickupLocation = { longitude: pickupLongitude, latitude: pickupLatitude };
  //   }

  //   if (dropoffLongitude !== undefined && dropoffLatitude !== undefined) {
  //     dropoffLocation = { longitude: dropoffLongitude, latitude: dropoffLatitude };
  //   }

  //   const vehicles = await this.ridesService.testPricesWithTime(
  //     seatingCapacity,
  //     distance,
  //     timeString,
  //     pickupLocation,
  //     dropoffLocation,
  //   );

  //   return vehicles;
  // }
}
