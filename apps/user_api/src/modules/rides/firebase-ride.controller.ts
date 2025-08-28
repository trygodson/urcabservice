import { Controller, Post, Get, Param, Body, UseGuards, Logger } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard } from '@urcab-workspace/shared';
import { FirebaseRideService } from './firebase-ride.service';
import { Types } from 'mongoose';

interface DriverResponseDto {
  action: 'accept' | 'reject';
}

interface DriverResponseResult {
  success: boolean;
  message: string;
  rideId?: string;
}

interface PassengerNotificationResult {
  success: boolean;
  notifications: any[];
}

@ApiTags('Firebase Real-time Rides')
@Controller('firebase-rides')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FirebaseRideController {
  private readonly logger = new Logger(FirebaseRideController.name);

  constructor(private readonly firebaseRideService: FirebaseRideService) {}

  @Post('driver-response/:rideId')
  @ApiOperation({ summary: 'Driver responds to ride request (accept/reject)' })
  @ApiResponse({
    status: 200,
    description: 'Driver response processed successfully',
    type: Object,
  })
  async handleDriverResponse(
    @Param('rideId') rideId: string,
    @CurrentUser() driver: any,
    @Body() responseDto: DriverResponseDto,
  ): Promise<DriverResponseResult> {
    try {
      await this.firebaseRideService.sendDriverResponse(driver.sub, rideId, responseDto.action);

      const message =
        responseDto.action === 'accept' ? 'Ride request accepted successfully' : 'Ride request rejected successfully';

      this.logger.log(`Driver ${driver.sub} ${responseDto.action}ed ride ${rideId}`);

      return {
        success: true,
        message,
        rideId,
      };
    } catch (error) {
      this.logger.error(`Failed to handle driver response: ${error.message}`);
      return {
        success: false,
        message: error.message,
        rideId,
      };
    }
  }

  @Get('driver-pending-requests')
  @ApiOperation({ summary: 'Get pending ride requests for driver' })
  @ApiResponse({
    status: 200,
    description: 'Retrieved pending ride requests',
    type: Array,
  })
  async getDriverPendingRequests(@CurrentUser() driver: any): Promise<any[]> {
    try {
      const pendingRequests = await this.firebaseRideService.getDriverPendingRequests(driver.sub);
      return pendingRequests;
    } catch (error) {
      this.logger.error(`Failed to get driver pending requests: ${error.message}`);
      return [];
    }
  }

  @Get('passenger-notifications')
  @ApiOperation({ summary: 'Get passenger real-time notifications' })
  @ApiResponse({
    status: 200,
    description: 'Retrieved passenger notifications',
    type: Object,
  })
  async getPassengerNotifications(@CurrentUser() passenger: any): Promise<PassengerNotificationResult> {
    try {
      const notifications = await this.firebaseRideService.getPassengerNotifications(passenger.sub);
      return {
        success: true,
        notifications,
      };
    } catch (error) {
      this.logger.error(`Failed to get passenger notifications: ${error.message}`);
      return {
        success: false,
        notifications: [],
      };
    }
  }

  @Post('passenger-notifications/clear')
  @ApiOperation({ summary: 'Clear passenger notifications' })
  @ApiResponse({
    status: 200,
    description: 'Notifications cleared successfully',
    type: Object,
  })
  async clearPassengerNotifications(@CurrentUser() passenger: any): Promise<{ success: boolean; message: string }> {
    try {
      await this.firebaseRideService.clearPassengerNotifications(passenger.sub);
      return {
        success: true,
        message: 'Notifications cleared successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to clear passenger notifications: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Get('passenger-ride-status/:rideId')
  @ApiOperation({ summary: 'Get passenger ride status from Firebase' })
  @ApiResponse({
    status: 200,
    description: 'Retrieved ride status',
    type: Object,
  })
  async getPassengerRideStatus(@Param('rideId') rideId: string, @CurrentUser() passenger: any): Promise<any> {
    try {
      const rideStatus = await this.firebaseRideService.getPassengerRideStatus(passenger.sub, rideId);
      return {
        success: true,
        rideStatus,
      };
    } catch (error) {
      this.logger.error(`Failed to get passenger ride status: ${error.message}`);
      return {
        success: false,
        rideStatus: null,
        message: error.message,
      };
    }
  }
}
