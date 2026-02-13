// services/ride-websocket.service.ts
import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RideGateway } from './gateway/ride.gateway';
import {
  RideRepository,
  UserRepository,
  VehicleRepository,
  RideStatus,
  FirebaseNotificationService,
  DriverLocation,
} from '@urcab-workspace/shared';
import { Model, Types } from 'mongoose';
import { DriverLocationRepository } from './repository/driver-location.repository';
import { InjectModel } from '@nestjs/mongoose';

interface RideRequest {
  rideId: string;
  passengerId: string;
  driverId: string;
  passengerName: string;
  passengerPhone: string;
  passengerPhoto?: string;
  passengerCount: number;
  pickupLocation: {
    address: string;
    coordinates: [number, number];
    landmark?: string;
  };
  dropoffLocation: {
    address: string;
    coordinates: [number, number];
    landmark?: string;
  };
  estimatedFare: number;
  estimatedDistance: number;
  estimatedDuration: number;
  requestTime: string;
  expiresAt: string;
}

@Injectable()
export class RideWebSocketService {
  private readonly logger = new Logger(RideWebSocketService.name);
  private rideGateway: RideGateway;

  constructor(
    private readonly redisService: RedisService,
    private readonly rideRepository: RideRepository,
    private readonly userRepository: UserRepository,
    private readonly vehicleRepository: VehicleRepository,
    @InjectModel(DriverLocation.name) private readonly driverLocationRepository: Model<DriverLocation>,
    private readonly firebaseNotificationService: FirebaseNotificationService,
  ) {
    // Subscribe to Redis channels for cross-service communication
    this.setupRedisSubscriptions();
  }

  // Set gateway reference (circular dependency resolution)
  setGateway(gateway: RideGateway) {
    this.rideGateway = gateway;
  }

  private async setupRedisSubscriptions() {
    // Subscribe to ride request responses
    await this.redisService.subscribe('ride_responses', (message) => {
      this.handleRideResponseFromRedis(message);
    });

    // Subscribe to ride status updates
    await this.redisService.subscribe('ride_status_updates', (message) => {
      this.handleRideStatusUpdateFromRedis(message);
    });
  }

  /**
   * Send ride request to selected driver
   */
  async sendRideRequestToDriver(rideRequest: RideRequest, driverFcmToken?: string): Promise<void> {
    try {
      // Also send FCM notification as fallback
      if (driverFcmToken) {
        try {
          await this.firebaseNotificationService.sendRideRequestToDriver(
            driverFcmToken,
            new Types.ObjectId(rideRequest.driverId),
            rideRequest as any,
          );
        } catch (fcmError) {
          this.logger.warn('FCM notification failed, but WebSocket sent:', fcmError.message);
        }
      }

      this.logger.log(`Ride request ${rideRequest.rideId} sent to driver ${rideRequest.driverId}`);

      // Set up auto-expiry (60 seconds for real-time response)
    } catch (error) {
      this.logger.error(`Failed to send ride request: ${error.message}`);
      throw new BadRequestException(`Failed to send ride request: ${error.message}`);
    }
  }

  /**
   * Handle driver response (accept/reject)
   */
  async handleDriverResponse(
    rideId: string,
    driverId: string,
    action: 'accept' | 'reject',
    reason?: string,
  ): Promise<void> {
    try {
      // Get ride request from Redis
      const rideRequest = await this.redisService.getRideRequest(rideId);

      if (!rideRequest) {
        throw new BadRequestException('Ride request not found or expired');
      }

      if (rideRequest.driverId !== driverId) {
        throw new BadRequestException('You are not assigned to this ride request');
      }

      // Store driver response in Redis
      await this.redisService.storeDriverResponse(rideId, driverId, action);

      // Remove from driver's pending requests
      await this.redisService.removeDriverPendingRequest(driverId, rideId);

      if (action === 'accept') {
        await this.acceptRide(rideId, driverId, rideRequest.passengerId);
      } else {
        await this.rejectRide(rideId, driverId, reason);
      }

      // Clean up ride request from Redis
      await this.redisService.deleteRideRequest(rideId);

      this.logger.log(`Driver ${driverId} ${action}ed ride ${rideId}`);
    } catch (error) {
      this.logger.error(`Failed to handle driver response: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update driver location
   */
  async updateDriverLocation(driverId: string, locationUpdate: any): Promise<void> {
    try {
      // Update in MongoDB
      await this.driverLocationRepository.findOneAndUpdate(
        { driverId: new Types.ObjectId(driverId) },
        {
          location: locationUpdate.location,
          heading: locationUpdate.heading,
          speed: locationUpdate.speed,
          accuracy: locationUpdate.accuracy,
          lastLocationUpdate: locationUpdate.lastLocationUpdate,
          status: 'online',
          isAvailableForRides: true,
        },
        { upsert: true },
      );

      this.logger.log(`Updated location for driver ${driverId}`);
    } catch (error) {
      this.logger.error(`Failed to update driver location: ${error.message}`);
      throw error;
    }
  }

  /**
   * Accept ride and notify passenger
   */
  private async acceptRide(rideId: string, driverId: string, passengerId: string): Promise<void> {
    try {
      // Update ride in database
      await this.rideRepository.findOneAndUpdate(
        { _id: new Types.ObjectId(rideId) },
        {
          driverId: new Types.ObjectId(driverId),
          status: RideStatus.DRIVER_ACCEPTED,
          driverAssignedAt: new Date(),
        },
      );

      // Get driver info for passenger notification
      const driver = await this.userRepository.findById(driverId);
      const vehicle = await this.vehicleRepository.findOne({ driverId: new Types.ObjectId(driverId) });

      // Send status update to passenger via WebSocket
      if (this.rideGateway) {
        await this.rideGateway.sendStatusUpdateToPassenger(passengerId, {
          type: 'ride_accepted',
          rideId,
          status: RideStatus.DRIVER_ACCEPTED,
          message: 'Driver has accepted your ride request!',
          driverInfo: driver
            ? {
                name: `${driver.fullName}`,
                phone: driver.phone,
                photo: driver.photo,
                // rating: driver.rating || 0,
                vehicle: vehicle
                  ? {
                      make: vehicle.make,
                      model: vehicle.model,
                      year: vehicle.year,
                      color: vehicle.color,
                      licensePlate: vehicle.licensePlate,
                    }
                  : null,
              }
            : null,
          timestamp: Date.now(),
        });
      }

      this.logger.log(`Ride ${rideId} accepted by driver ${driverId}`);
    } catch (error) {
      this.logger.error(`Failed to accept ride: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get driver's active rides
   */
  async getDriverActiveRides(driverId: string): Promise<any[]> {
    try {
      const activeStatuses = [RideStatus.DRIVER_ACCEPTED, RideStatus.RIDE_STARTED];

      return await this.rideRepository.find({
        driverId: new Types.ObjectId(driverId),
        status: { $in: activeStatuses },
      });
    } catch (error) {
      this.logger.error(`Failed to get driver active rides: ${error.message}`);
      return [];
    }
  }

  /**
   * Reject ride and notify passenger
   */
  private async rejectRide(rideId: string, driverId: string, reason?: string): Promise<void> {
    try {
      // Update ride in database
      await this.rideRepository.findOneAndUpdate(
        { _id: new Types.ObjectId(rideId) },
        {
          status: RideStatus.REJECTED_BY_DRIVER,
          rejectedBy: new Types.ObjectId(driverId),
          rejectedAt: new Date(),
          rejectionReason: reason || 'Driver is not available',
        },
      );

      // Get ride details for finding alternative drivers
      const ride = await this.rideRepository.findById(rideId);

      if (ride) {
        // Send status update to passenger via WebSocket
        if (this.rideGateway) {
          await this.rideGateway.sendStatusUpdateToPassenger(ride.passengerId.toString(), {
            type: 'ride_rejected',
            rideId,
            status: RideStatus.REJECTED_BY_DRIVER,
            message: 'Driver declined your request. Finding another driver for you...',
            reason: reason || 'Driver is not available',
            timestamp: Date.now(),
          });
        }
      }

      this.logger.log(`Ride ${rideId} rejected by driver ${driverId}`);
    } catch (error) {
      this.logger.error(`Failed to reject ride: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle ride request expiry
   */
  private async handleRideRequestExpiry(rideId: string): Promise<void> {
    try {
      const rideRequest = await this.rideRepository.findById(rideId);

      if (!rideRequest) {
        throw new NotFoundException('Ride not found');
      }

      if (
        [RideStatus.PENDING_DRIVER_ACCEPTANCE, RideStatus.REJECTED_BY_DRIVER].includes(rideRequest.status as RideStatus)
      ) {
        if (rideRequest) {
          let driver: any = null;
          if (rideRequest?.selectedDriverId) {
            driver = await this.userRepository.findById(rideRequest?.selectedDriverId.toString());
          }
          const passenger = await this.userRepository.findById(rideRequest.passengerId._id.toString());
          const updatedRide = await this.rideRepository.findOneAndUpdate(
            { _id: new Types.ObjectId(rideId) },
            {
              status: RideStatus.RIDE_TIMEOUT,
              cancelledAt: new Date(),
              cancelReason: 'Drivers did not respond in time',
            },
          );

          if (passenger?.fcmToken) {
            await this.firebaseNotificationService.sendRideStatusUpdate(
              passenger.fcmToken,
              RideStatus.RIDE_TIMEOUT,
              rideId,
              driver,
              updatedRide,
            );
          }

          await this.rideRepository.findByIdAndDelete(rideId);
        }
        // return;
      }
    } catch (error) {
      console.log(error, '====error====');
      this.logger.error(`Failed to handle ride request expiry: ${error?.message}`);
    }
  }

  private validateStatusChange(currentStatus: RideStatus, newStatus: RideStatus): void {
    const validTransitions: Record<RideStatus, RideStatus[]> = {
      [RideStatus.SEARCHING_DRIVER]: [
        RideStatus.PENDING_DRIVER_ACCEPTANCE,
        RideStatus.DRIVER_ACCEPTED,
        RideStatus.RIDE_CANCELLED,
      ],
      [RideStatus.PENDING_DRIVER_ACCEPTANCE]: [
        RideStatus.DRIVER_ACCEPTED,
        RideStatus.REJECTED_BY_DRIVER,
        RideStatus.RIDE_CANCELLED,
      ],
      [RideStatus.REJECTED_BY_DRIVER]: [RideStatus.PENDING_DRIVER_ACCEPTANCE, RideStatus.RIDE_CANCELLED],
      [RideStatus.SCHEDULED]: [RideStatus.SEARCHING_DRIVER, RideStatus.RIDE_CANCELLED],
      [RideStatus.DRIVER_ACCEPTED]: [
        RideStatus.DRIVER_AT_PICKUPLOCATION,
        RideStatus.RIDE_CANCELLED,
        RideStatus.DRIVER_HAS_PICKUP_PASSENGER,
      ],
      [RideStatus.RIDE_STARTED]: [
        RideStatus.RIDE_COMPLETED,
        RideStatus.RIDE_REACHED_DESTINATION,
        RideStatus.RIDE_CANCELLED,
      ],
      [RideStatus.RIDE_REACHED_DESTINATION]: [RideStatus.RIDE_COMPLETED, RideStatus.RIDE_CANCELLED],
      [RideStatus.RIDE_TIMEOUT]: [],
      [RideStatus.DRIVER_AT_PICKUPLOCATION]: [
        RideStatus.DRIVER_HAS_PICKUP_PASSENGER,
        RideStatus.RIDE_STARTED,
        RideStatus.RIDE_CANCELLED,
      ],
      [RideStatus.DRIVER_HAS_PICKUP_PASSENGER]: [
        RideStatus.RIDE_STARTED,
        RideStatus.RIDE_COMPLETED,
        RideStatus.RIDE_CANCELLED,
      ],
      [RideStatus.RIDE_COMPLETED]: [RideStatus.RIDE_CANCELLED],
      [RideStatus.RIDE_CANCELLED]: [],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }

  /**
   * Cancel ride
   */
  async cancelRide(rideId: string, userId: string, reason?: string): Promise<void> {
    try {
      const ride = await this.rideRepository.findById(rideId);

      if (!ride) {
        throw new BadRequestException('Ride not found');
      }

      // Check if user can cancel this ride
      const canCancel =
        ride.passengerId.toString() === userId || (ride.driverId && ride.driverId.toString() === userId);

      if (!canCancel) {
        throw new BadRequestException('Unauthorized to cancel this ride');
      }

      // Update ride in database
      await this.rideRepository.findOneAndUpdate(
        { _id: new Types.ObjectId(rideId) },
        {
          status: RideStatus.RIDE_CANCELLED,
          cancelledAt: new Date(),
          cancelledBy: new Types.ObjectId(userId),
          cancellationReason: reason,
        },
      );

      // Notify the other party via WebSocket
      const isPassenger = ride.passengerId.toString() === userId;
      const targetUserId = isPassenger ? ride.driverId?.toString() : ride.passengerId.toString();

      if (targetUserId && this.rideGateway) {
        const targetUserType = isPassenger ? 'driver' : 'passenger';
        const method = isPassenger
          ? this.rideGateway.sendRideRequestToDriver
          : this.rideGateway.sendStatusUpdateToPassenger;

        await method.call(this.rideGateway, targetUserId, {
          type: 'ride_cancelled',
          rideId,
          status: RideStatus.RIDE_CANCELLED,
          message: `Ride has been cancelled by ${isPassenger ? 'passenger' : 'driver'}`,
          reason: reason,
          timestamp: Date.now(),
        });
      }

      // Clean up Redis data
      await this.redisService.deleteRideRequest(rideId);
      if (ride.driverId) {
        await this.redisService.removeDriverPendingRequest(ride.driverId.toString(), rideId);
      }

      this.logger.log(`Ride ${rideId} cancelled by user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to cancel ride: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get driver pending requests
   */
  async getDriverPendingRequests(driverId: string): Promise<any[]> {
    try {
      const rideIds = await this.redisService.getDriverPendingRequests(driverId);
      const requests = [];

      for (const rideId of rideIds) {
        const rideRequest = await this.redisService.getRideRequest(rideId);
        if (rideRequest) {
          requests.push({
            requestId: rideId,
            ...rideRequest,
          });
        }
      }

      return requests;
    } catch (error) {
      this.logger.error(`Failed to get driver pending requests: ${error.message}`);
      return [];
    }
  }

  /**
   * Handle ride response from Redis pub/sub
   */
  private async handleRideResponseFromRedis(message: any): Promise<void> {
    try {
      // Handle cross-service ride responses if needed
      this.logger.log('Received ride response from Redis:', message);
    } catch (error) {
      this.logger.error('Failed to handle ride response from Redis:', error);
    }
  }

  /**
   * Handle ride status update from Redis pub/sub
   */
  private async handleRideStatusUpdateFromRedis(message: any): Promise<void> {
    try {
      // Handle cross-service status updates if needed
      this.logger.log('Received ride status update from Redis:', message);
    } catch (error) {
      this.logger.error('Failed to handle ride status update from Redis:', error);
    }
  }

  /**
   * Update ride status and notify relevant parties
   */
  async updateRideStatus(
    rideId: string,
    status: RideStatus,
    updateData: any = {},
    notifyBoth: boolean = true,
  ): Promise<void> {
    try {
      // Update ride in database
      const updatedRide = await this.rideRepository.findOneAndUpdate(
        { _id: new Types.ObjectId(rideId) },
        { status, ...updateData, updatedAt: new Date() },
      );

      if (!updatedRide) {
        throw new BadRequestException('Ride not found');
      }

      // Prepare status update message
      const statusUpdate = {
        type: 'ride_status_update',
        rideId,
        status,
        message: this.getStatusMessage(status),
        timestamp: Date.now(),
        ...updateData,
      };

      // Notify passenger
      if (this.rideGateway && (notifyBoth || true)) {
        await this.rideGateway.sendStatusUpdateToPassenger(updatedRide.passengerId.toString(), statusUpdate);
      }

      // Notify driver if assigned
      if (this.rideGateway && updatedRide.driverId && notifyBoth) {
        await this.rideGateway.sendRideRequestToDriver(updatedRide.driverId.toString(), statusUpdate);
      }

      this.logger.log(`Updated ride ${rideId} status to ${status}`);
    } catch (error) {
      this.logger.error(`Failed to update ride status: ${error.message}`);
      throw error;
    }
  }

  private getStatusMessage(status: RideStatus): string {
    const messages = {
      [RideStatus.SEARCHING_DRIVER]: 'Looking for nearby drivers...',
      [RideStatus.PENDING_DRIVER_ACCEPTANCE]: 'Waiting for driver response...',
      [RideStatus.DRIVER_ACCEPTED]: 'Driver has accepted your ride!',
      [RideStatus.REJECTED_BY_DRIVER]: 'Driver declined your request.',
      [RideStatus.RIDE_STARTED]: 'Your ride has started!',
      [RideStatus.RIDE_COMPLETED]: 'Ride completed successfully!',
      [RideStatus.RIDE_CANCELLED]: 'Ride has been cancelled.',
    };

    return messages[status] || 'Ride status updated.';
  }
}
