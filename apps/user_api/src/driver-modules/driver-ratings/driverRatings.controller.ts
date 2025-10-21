import { Controller, Get, Post, Body, Param, UseGuards, HttpStatus, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { DriverRatingsService } from './driverRatings.service';
import { SubmitRatingDto } from 'apps/user_api/src/modules/ratings/dtos';
import { JwtAuthGuard, RolesGuard, Role, CurrentUser, User, SetRolesMetaData } from '@urcab-workspace/shared';

@ApiTags('Driver Ratings')
@Controller('driver/ratings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DriverRatingsController {
  constructor(private readonly driverRatingsService: DriverRatingsService) {}

  @Post('submit')
  @ApiOperation({ summary: 'Submit a rating for a passenger (from driver)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Rating submitted successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid rating data or already rated',
  })
  @SetRolesMetaData(Role.DRIVER)
  async submitDriverRating(@Body() submitRatingDto: SubmitRatingDto, @CurrentUser() user: User) {
    const driverId = new Types.ObjectId(user._id);
    return await this.driverRatingsService.submitDriverRating(driverId, submitRatingDto);
  }

  @Get('rated/:rideId')
  @ApiOperation({ summary: 'Check if driver has already rated a ride' })
  @ApiParam({
    name: 'rideId',
    description: 'Ride ID to check',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns whether the ride has been rated by the user',
    schema: {
      type: 'object',
      properties: {
        hasRated: { type: 'boolean' },
        rating: {
          type: 'object',
          nullable: true,
          description: 'Rating details if the ride has been rated',
        },
      },
    },
  })
  @SetRolesMetaData(Role.DRIVER)
  async hasDriverRatedRide(@Param('rideId') rideId: string, @CurrentUser() user: User) {
    if (!Types.ObjectId.isValid(rideId)) {
      throw new BadRequestException('Invalid ride ID format');
    }

    const driverId = new Types.ObjectId(user._id);
    const hasRated = await this.driverRatingsService.hasDriverRatedRide(driverId, rideId);
    let rating = null;

    if (hasRated) {
      rating = await this.driverRatingsService.getRatingForRide(rideId, driverId);
    }

    return { hasRated, rating };
  }

  @Get('received')
  @ApiOperation({ summary: 'Get ratings received by the driver' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Driver ratings retrieved successfully',
  })
  @SetRolesMetaData(Role.DRIVER)
  async getDriverReceivedRatings(@CurrentUser() user: User) {
    const driverId = new Types.ObjectId(user._id);
    return await this.driverRatingsService.getDriverReceivedRatings(driverId);
  }
}
