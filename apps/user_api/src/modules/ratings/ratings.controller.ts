import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RatingsService } from './ratings.service';
import { SubmitRatingDto } from './dtos';
import { JwtAuthGuard, RolesGuard, Role, CurrentUser, User, SetRolesMetaData } from '@urcab-workspace/shared';

@ApiTags('Ratings')
@Controller('ratings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post('passenger/submit')
  @ApiOperation({ summary: 'Submit a rating for a driver (from passenger)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Rating submitted successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid rating data or already rated',
  })
  @SetRolesMetaData(Role.PASSENGER)
  async submitPassengerRating(@Body() submitRatingDto: SubmitRatingDto, @CurrentUser() user: User) {
    const passengerId = new Types.ObjectId(user._id);
    return await this.ratingsService.submitPassengerRating(passengerId, submitRatingDto);
  }

  @Get('passenger/rated/:rideId')
  @ApiOperation({ summary: 'Check if passenger has already rated a ride' })
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
  @SetRolesMetaData(Role.PASSENGER)
  async hasPassengerRatedRide(@Param('rideId') rideId: string, @CurrentUser() user: User) {
    if (!Types.ObjectId.isValid(rideId)) {
      throw new BadRequestException('Invalid ride ID format');
    }

    const passengerId = new Types.ObjectId(user._id);
    const hasRated = await this.ratingsService.hasUserRatedRide(passengerId, rideId);
    let rating = null;

    if (hasRated) {
      rating = await this.ratingsService.getRatingForRide(rideId, passengerId);
    }

    return { hasRated, rating };
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get ratings for a user' })
  @ApiParam({
    name: 'userId',
    description: 'User ID to get ratings for',
    type: 'string',
  })
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
    description: 'Ratings retrieved successfully',
  })
  @UseGuards(JwtAuthGuard)
  async getUserRatings(
    @Param('userId') userId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
  ) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID format');
    }

    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 10;

    return await this.ratingsService.getUserRatings(new Types.ObjectId(userId), page, limit);
  }
}
