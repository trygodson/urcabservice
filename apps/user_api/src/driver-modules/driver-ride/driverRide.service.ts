import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  DriverOnlineStatus,
  FirebaseNotificationService,
  RideRepository,
  RideStatus,
  UserRepository,
} from '@urcab-workspace/shared';
import { RideResponseDto } from 'apps/user_api/src/modules/rides/dtos';
import { Types } from 'mongoose';
import { DriverLocationRepository } from './repository/driver-location.repository';
import { DriverRideRepository } from './repository/driverRide.repository';
import { FirebaseRideService } from '../../modules/rides/firebase-ride.service';

export interface NearbyRideRequestDto {
  _id: string;
  passengerId: string;
  passengerName: string;
  passengerPhone: string;
  passengerPhoto?: string;
  passengerRating?: number;
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
  distanceToPickup: number;
  estimatedArrivalTime: number;
  rideType: string;
  passengerCount: number;
  specialRequests?: string;
  createdAt: Date;
  timeElapsed?: number; // seconds since ride was created
}

export interface CompleteRideDto {
  finalFare?: number;
  actualDistance?: number;
  actualDuration?: number;
  notes?: string;
}

@Injectable()
export class DriverRideService {
  protected readonly logger = new Logger(DriverRideService.name);
  constructor(
    private readonly rideRepository: RideRepository,
    private readonly driverLocationRepository: DriverLocationRepository,
    private readonly driverRideRepository: DriverRideRepository,
    private readonly userRepository: UserRepository,
    private readonly firebaseNotificationService: FirebaseNotificationService,
    private readonly firebaseRideService: FirebaseRideService,
  ) {}

  async acceptRide(rideId: string, driverId: Types.ObjectId): Promise<RideResponseDto> {
    try {
      const ride = await this.rideRepository.findById(rideId);

      if (!ride) {
        throw new NotFoundException('Ride not found');
      }

      // Check if ride is still available for assignment
      if (!(ride.status === RideStatus.PENDING_DRIVER_ACCEPTANCE || ride.status === RideStatus.SEARCHING_DRIVER)) {
        throw new BadRequestException('Ride is no longer available');
      }

      // Validate driver is still available

      const driverLocation = await this.driverLocationRepository.getDriverLocation(driverId);
      if (!driverLocation || !driverLocation.isAvailableForRides) {
        throw new BadRequestException('You Are no longer available');
      }

      // Update ride status and assign driver

      const updatedRide = await this.rideRepository.findByIdAndUpdate(rideId, {
        driverId,
        status: RideStatus.DRIVER_ACCEPTED,
        driverAssignedAt: new Date(),
      });

      // Update driver availability

      await this.driverLocationRepository.updateDriverStatus(driverId, DriverOnlineStatus.BUSY, false, rideId);

      // Get driver details for notification
      const driver = await this.userRepository.findById(driverId.toString());
      const passenger = await this.userRepository.findById(ride.passengerId._id.toString());

      // Send notification to passenger
      if (passenger?.fcmToken) {
        await this.firebaseNotificationService.sendRideStatusUpdate(
          passenger.fcmToken,
          'DRIVER_ACCEPTED',
          rideId,
          driver,
          updatedRide,
        );
      }

      this.logger.log(`Ride ${rideId} accepted by driver ${driverId}`);
      return this.mapToResponseDto(updatedRide);

      // // return updatedRide
    } catch (error) {
      this.logger.error(`Failed to accept ride ${rideId} by driver ${driverId}`, error.stack);
      const ride = await this.rideRepository.findById(rideId);

      await this.rideRepository.findByIdAndUpdate(rideId, {
        status: ride.status,
        // driverAssignedAt: new Date(),
      });
      const driverLocation = await this.driverLocationRepository.getDriverLocation(driverId);
      await this.driverLocationRepository.updateDriverStatus(driverId, driverLocation.status, true);

      throw error;
    }
  }

  async getNearbyRideRequests(
    driverId: Types.ObjectId,
    longitude: number,
    latitude: number,
    radius: number = 10,
  ): Promise<NearbyRideRequestDto[]> {
    try {
      this.logger.log(`Getting nearby ride requests for driver ${driverId} at [${longitude}, ${latitude}]`);

      // Validate driver is online and available
      const driverLocation = await this.driverLocationRepository.getDriverLocation(driverId);
      if (!driverLocation || driverLocation.status !== DriverOnlineStatus.ONLINE) {
        throw new BadRequestException('Driver is not online');
      }

      // Find rides searching for drivers within radius
      const nearbyRides = await this.driverRideRepository.findNearbyRideRequests(longitude, latitude, radius, driverId);
      console.log(nearbyRides, '=====nearbyrides=====');
      this.logger.debug(`Found ${nearbyRides.length} nearby ride requests`);

      // Process and enrich ride data
      const enrichedRides: NearbyRideRequestDto[] = [];

      for (const ride of nearbyRides) {
        try {
          // Get passenger details
          const passenger = await this.userRepository.findById(ride.passengerId.toString());
          if (!passenger) continue;

          // Calculate distance to pickup
          const distanceToPickup = this.calculateDistance(
            { longitude, latitude },
            {
              longitude: ride.pickupLocation.coordinates[0],
              latitude: ride.pickupLocation.coordinates[1],
            },
          );

          // Calculate estimated arrival time (assuming 30 km/h average speed)
          const estimatedArrivalTime = Math.ceil((distanceToPickup / 30) * 60); // minutes

          // Calculate time elapsed since ride was created
          // const timeElapsed = Math.floor((Date.now() - ride?.createdAt.getTime()) / 1000);

          const enrichedRide: NearbyRideRequestDto = {
            _id: ride._id.toString(),
            passengerId: passenger._id.toString(),
            passengerName: `${passenger.firstName} ${passenger.lastName}`,
            passengerPhone: passenger.phone,
            passengerPhoto: passenger.photo,
            // passengerRating: passenger?.rating || 0,
            pickupLocation: {
              address: ride.pickupLocation.address,
              coordinates: ride.pickupLocation.coordinates as [number, number],
              landmark: ride.pickupLocation.landmark,
            },
            dropoffLocation: {
              address: ride.dropoffLocation.address,
              coordinates: ride.dropoffLocation.coordinates as [number, number],
              landmark: ride.dropoffLocation.landmark,
            },
            estimatedFare: ride.estimatedFare || 0,
            estimatedDistance: ride.estimatedDistance || 0,
            estimatedDuration: ride.estimatedDuration || 0,
            distanceToPickup,
            estimatedArrivalTime,
            rideType: ride.rideType,
            passengerCount: ride.passengerCount,
            specialRequests: ride.specialRequests,
            createdAt: new Date(),
            // timeElapsed,
          };

          enrichedRides.push(enrichedRide);
        } catch (error) {
          this.logger.error(`Failed to process ride ${ride._id}`, error.stack);
          continue;
        }
      }

      // Sort by distance to pickup (closest first) and time elapsed (newest first)
      enrichedRides.sort((a, b) => {
        if (Math.abs(a.distanceToPickup - b.distanceToPickup) < 0.5) {
          return a.timeElapsed - b.timeElapsed; // If similar distance, prioritize newer requests
        }
        return a.distanceToPickup - b.distanceToPickup;
      });

      return enrichedRides;
    } catch (error) {
      this.logger.error(`Failed to get nearby ride requests for driver ${driverId}`, error.stack);
      throw new BadRequestException('Failed to get nearby ride requests');
    }
  }

  async driverAtPickupLocationRide(rideId: string, driverId: Types.ObjectId): Promise<RideResponseDto> {
    try {
      const ride = await this.rideRepository.findById(rideId);
      if (!ride) {
        throw new NotFoundException('Ride not found');
      }

      // Validate driver is assigned to this ride
      if (!ride.driverId || !ride.driverId.equals(driverId)) {
        throw new BadRequestException('You are not assigned to this ride');
      }

      // Check if ride can be started
      // if (ride.status !== RideStatus.DRIVER_ACCEPTED) {
      //   throw new BadRequestException(`Cannot start ride. Current status: ${ride.status}`);
      // }

      if (ride.status) {
        this.validateStatusChange(ride.status as RideStatus, RideStatus.DRIVER_AT_PICKUPLOCATION as RideStatus);
      }

      // Update ride status
      const updatedRide = await this.rideRepository.findByIdAndUpdate(rideId, {
        status: RideStatus.DRIVER_AT_PICKUPLOCATION,
        startedAt: new Date(),
      });

      // Get passenger and driver details for notifications
      const passenger = await this.userRepository.findById(ride.passengerId?._id._id.toString());
      const driver = await this.userRepository.findById(driverId.toString());

      // Send notification to passenger
      if (passenger?.fcmToken) {
        await this.firebaseNotificationService.sendRideStatusUpdate(
          passenger.fcmToken,
          RideStatus.DRIVER_AT_PICKUPLOCATION,
          rideId,
          driver,
          updatedRide,
        );
      }

      this.logger.log(`Ride ${rideId} picked up Passenger ${passenger?._id} by driver ${driverId}`);
      return this.mapToResponseDto(updatedRide);
    } catch (error) {
      this.logger.error(`Failed to start ride ${rideId} by driver ${driverId}`, error.stack);
      throw error;
    }
  }
  async startRide(rideId: string, driverId: Types.ObjectId): Promise<RideResponseDto> {
    try {
      const ride = await this.rideRepository.findById(rideId);
      if (!ride) {
        throw new NotFoundException('Ride not found');
      }

      // Validate driver is assigned to this ride
      if (!ride.driverId || !ride.driverId.equals(driverId)) {
        throw new BadRequestException('You are not assigned to this ride');
      }

      // Check if ride can be started
      // if (ride.status !== RideStatus.DRIVER_AT_PICKUPLOCATION) {
      //   throw new BadRequestException(`Cannot start ride. Current status: ${ride.status}`);
      // }

      // Update ride status
      const updatedRide = await this.rideRepository.findByIdAndUpdate(rideId, {
        status: RideStatus.RIDE_STARTED,
        startedAt: new Date(),
      });
      if (ride.status) {
        this.validateStatusChange(ride.status as RideStatus, RideStatus.RIDE_STARTED as RideStatus);
      }

      // Get passenger and driver details for notifications
      const passenger = await this.userRepository.findById(ride.passengerId?._id._id.toString());
      const driver = await this.userRepository.findById(driverId.toString());

      // Send notification to passenger
      if (passenger?.fcmToken) {
        await this.firebaseNotificationService.sendRideStatusUpdate(
          passenger.fcmToken,
          RideStatus.RIDE_STARTED,
          rideId,
          driver,
          updatedRide,
        );
      }

      this.logger.log(`Ride ${rideId} started by driver ${driverId}`);
      return this.mapToResponseDto(updatedRide);
    } catch (error) {
      this.logger.error(`Failed to start ride ${rideId} by driver ${driverId}`, error.stack);
      throw error;
    }
  }

  async completeRide(
    rideId: string,
    driverId: Types.ObjectId,
    completeData: CompleteRideDto,
  ): Promise<RideResponseDto> {
    try {
      const ride = await this.rideRepository.findById(rideId);
      if (!ride) {
        throw new NotFoundException('Ride not found');
      }

      // Validate driver is assigned to this ride
      if (!ride.driverId || !ride.driverId.equals(driverId)) {
        throw new BadRequestException('You are not assigned to this ride');
      }

      // Check if ride can be completed
      // if (ride.status !== RideStatus.RIDE_STARTED) {
      //   throw new BadRequestException(`Cannot complete ride. Current status: ${ride.status}`);
      // }

      if (ride.status) {
        this.validateStatusChange(ride.status as RideStatus, RideStatus.RIDE_COMPLETED as RideStatus);
      }

      // Calculate actual duration if not provided
      let actualDuration = completeData.actualDuration;
      if (!actualDuration && ride.startedAt) {
        actualDuration = Math.ceil((Date.now() - ride.startedAt.getTime()) / (1000 * 60)); // minutes
      }

      // Use final fare from request or estimated fare
      const finalFare = completeData.finalFare || ride.estimatedFare || 0;

      // Update ride with completion data
      const updateData = {
        status: RideStatus.RIDE_COMPLETED,
        completedAt: new Date(),
        finalFare,
        actualDistance: completeData.actualDistance || ride.estimatedDistance,
        actualDuration,
        notes: completeData.notes,
      };

      const updatedRide = await this.rideRepository.findByIdAndUpdate(rideId, updateData);

      // Update driver availability - make them available again
      await this.driverLocationRepository.updateDriverStatus(driverId, DriverOnlineStatus.ONLINE, true);

      // Get passenger and driver details for notifications
      const passenger = await this.userRepository.findById(ride.passengerId?._id?._id.toString());
      const driver = await this.userRepository.findById(driverId.toString());

      // Send completion notification to passenger
      if (passenger?.fcmToken) {
        await this.firebaseNotificationService.sendRideStatusUpdate(
          passenger.fcmToken,
          RideStatus.RIDE_COMPLETED,
          rideId,
          driver,
          updatedRide,
        );
      }

      this.logger.log(`Ride ${rideId} completed by driver ${driverId}. Final fare: RM${finalFare}`);
      return this.mapToResponseDto(updatedRide);
    } catch (error) {
      this.logger.error(`Failed to complete ride ${rideId} by driver ${driverId}`, error.stack);
      throw error;
    }
  }

  async cancelRide(rideId: string, driverId: Types.ObjectId, reason?: string): Promise<RideResponseDto> {
    try {
      const ride = await this.rideRepository.findById(rideId);
      if (!ride) {
        throw new NotFoundException('Ride not found');
      }

      // Validate driver is assigned to this ride
      if (!ride.driverId || !ride.driverId.equals(driverId)) {
        throw new BadRequestException('You are not assigned to this ride');
      }

      // Check if ride can be cancelled
      if ([RideStatus.RIDE_COMPLETED, RideStatus.RIDE_CANCELLED].includes(ride.status as RideStatus)) {
        throw new BadRequestException('Cannot cancel a completed or already cancelled ride');
      }

      const updateData = {
        status: RideStatus.RIDE_CANCELLED,
        cancelledAt: new Date(),
        cancelledBy: driverId,
        cancellationReason: reason || 'Cancelled by driver',
      };

      const updatedRide = await this.rideRepository.findByIdAndUpdate(rideId, updateData);

      // Update driver availability - make them available again
      await this.driverLocationRepository.updateDriverStatus(driverId, DriverOnlineStatus.ONLINE, true);

      // Get passenger and driver details for notifications
      const passenger = await this.userRepository.findById(ride.passengerId?._id.toString());
      const driver = await this.userRepository.findById(driverId.toString());

      // Send cancellation notification to passenger
      if (passenger?.fcmToken) {
        await this.firebaseNotificationService.sendRideStatusUpdate(
          passenger.fcmToken,
          RideStatus.RIDE_CANCELLED,
          rideId,
          driver,
          updatedRide,
        );
      }

      this.logger.log(`Ride ${rideId} cancelled by driver ${driverId}. Reason: ${reason}`);
      return this.mapToResponseDto(updatedRide);
    } catch (error) {
      this.logger.error(`Failed to cancel ride ${rideId} by driver ${driverId}`, error.stack);
      throw error;
    }
  }

  async getDriverRideHistory(
    driverId: Types.ObjectId,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    rides: RideResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    stats: {
      totalRides: number;
      completedRides: number;
      cancelledRides: number;
      totalEarnings: number;
      averageRating: number;
    };
  }> {
    try {
      this.logger.debug(`Getting ride history for driver ${driverId}, page ${page}, limit ${limit}`);

      // Get paginated rides for the driver
      const result = await this.rideRepository.findDriverRides(driverId, page, limit);

      // Calculate driver statistics
      const stats = await this.calculateDriverStats(driverId);

      const totalPages = Math.ceil(result.total / limit);

      return {
        rides: result.rides.map((ride) => this.mapToResponseDto(ride)),
        total: result.total,
        page,
        limit,
        totalPages,
        stats,
      };
    } catch (error) {
      this.logger.error(`Failed to get ride history for driver ${driverId}`, error.stack);
      throw new BadRequestException('Failed to get ride history');
    }
  }

  async getCurrentRide(driverId: Types.ObjectId): Promise<RideResponseDto | null> {
    try {
      const currentRide = await this.driverRideRepository.findDriverCurrentRide(driverId);
      return currentRide ? this.mapToResponseDto(currentRide) : null;
    } catch (error) {
      this.logger.error(`Failed to get current ride for driver ${driverId}`, error.stack);
      throw new BadRequestException('Failed to get current ride');
    }
  }

  async getRideById(rideId: string, driverId: Types.ObjectId): Promise<RideResponseDto> {
    try {
      const ride = await this.rideRepository.findById(rideId);
      if (!ride) {
        throw new NotFoundException('Ride not found');
      }

      // Validate driver has access to this ride
      if (!ride.driverId || !ride.driverId.equals(driverId)) {
        throw new BadRequestException('You do not have access to this ride');
      }

      return this.mapToResponseDto(ride);
    } catch (error) {
      this.logger.error(`Failed to get ride ${rideId} for driver ${driverId}`, error.stack);
      throw error;
    }
  }

  async updateDriverArrivalStatus(rideId: string, driverId: Types.ObjectId): Promise<RideResponseDto> {
    try {
      const ride = await this.rideRepository.findById(rideId);
      if (!ride) {
        throw new NotFoundException('Ride not found');
      }

      // Validate driver is assigned to this ride
      if (!ride.driverId || !ride.driverId.equals(driverId)) {
        throw new BadRequestException('You are not assigned to this ride');
      }

      if (ride.status) {
        this.validateStatusChange(ride.status as RideStatus, ride.status as RideStatus);
      }
      // Check if driver can mark as arrived
      if (ride.status !== RideStatus.DRIVER_ACCEPTED) {
        throw new BadRequestException(`Cannot update arrival status. Current status: ${ride.status}`);
      }

      const updatedRide = await this.rideRepository.findByIdAndUpdate(rideId, {
        driverId,
        status: RideStatus.DRIVER_AT_PICKUPLOCATION,
        driverAssignedAt: new Date(),
      });
      // For now, we can just send a notification without changing ride status
      // In the future, you might want to add an "ARRIVED" status
      const passenger = await this.userRepository.findById(ride.passengerId?._id.toString());
      const driver = await this.userRepository.findById(driverId.toString());

      // Send arrival notification to passenger
      if (passenger?.fcmToken) {
        await this.firebaseNotificationService.sendRideStatusUpdate(
          passenger.fcmToken,
          RideStatus.DRIVER_AT_PICKUPLOCATION,
          rideId,
          driver,
          updatedRide,
        );
      }

      this.logger.log(`Driver ${driverId} marked as arrived for ride ${rideId}`);
      return this.mapToResponseDto(ride);
    } catch (error) {
      this.logger.error(`Failed to update arrival status for ride ${rideId} by driver ${driverId}`, error.stack);
      throw error;
    }
  }
  async updateDriverArrivalPickUpPassengerStatus(rideId: string, driverId: Types.ObjectId): Promise<RideResponseDto> {
    console.log('=====reached here====');
    try {
      const ride = await this.rideRepository.findById(rideId);
      if (!ride) {
        throw new NotFoundException('Ride not found');
      }

      // Validate driver is assigned to this ride
      if (!ride.driverId || !ride.driverId.equals(driverId)) {
        throw new BadRequestException('You are not assigned to this ride');
      }

      // Check if driver can mark as arrived
      // if (ride.status !== RideStatus.DRIVER_ACCEPTED) {
      //   throw new BadRequestException(`Cannot update arrival status. Current status: ${ride.status}`);
      // }
      console.log(ride, '=====ride====');
      if (ride.status) {
        this.validateStatusChange(ride.status as RideStatus, RideStatus.DRIVER_HAS_PICKUP_PASSENGER as RideStatus);
      }

      const updatedRide = await this.rideRepository.findByIdAndUpdate(rideId, {
        driverId,
        status: RideStatus.DRIVER_HAS_PICKUP_PASSENGER,
        driverAssignedAt: new Date(),
      });
      // For now, we can just send a notification without changing ride status
      // In the future, you might want to add an "ARRIVED" status
      const passenger = await this.userRepository.findById(ride.passengerId?._id.toString());
      const driver = await this.userRepository.findById(driverId.toString());

      // Send arrival notification to passenger
      if (passenger?.fcmToken) {
        await this.firebaseNotificationService.sendRideStatusUpdate(
          passenger.fcmToken,
          RideStatus.DRIVER_HAS_PICKUP_PASSENGER,
          rideId,
          driver,
          updatedRide,
        );
      }

      this.logger.log(`Driver ${driverId} marked as arrived for ride ${rideId}`);
      return this.mapToResponseDto(updatedRide);
    } catch (error) {
      this.logger.error(`Failed to update arrival status for ride ${rideId} by driver ${driverId}`, error.stack);
      throw error;
    }
  }

  private async calculateDriverStats(driverId: Types.ObjectId) {
    try {
      const stats = await this.driverRideRepository.getDriverStats(driverId);

      return {
        totalRides: stats.totalRides || 0,
        completedRides: stats.completedRides || 0,
        cancelledRides: stats.cancelledRides || 0,
        totalEarnings: stats.totalEarnings || 0,
        averageRating: stats.averageRating || 0,
      };
    } catch (error) {
      this.logger.error(`Failed to calculate stats for driver ${driverId}`, error.stack);
      return {
        totalRides: 0,
        completedRides: 0,
        cancelledRides: 0,
        totalEarnings: 0,
        averageRating: 0,
      };
    }
  }

  private calculateDistance(
    coord1: { longitude: number; latitude: number },
    coord2: { longitude: number; latitude: number },
  ): number {
    // Haversine formula for calculating distance between two points
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(coord2.latitude - coord1.latitude);
    const dLon = this.toRadians(coord2.longitude - coord1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(coord1.latitude)) *
        Math.cos(this.toRadians(coord2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
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
      [RideStatus.RIDE_STARTED]: [RideStatus.RIDE_COMPLETED, RideStatus.RIDE_CANCELLED],
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
  private mapToResponseDto(ride: any): RideResponseDto {
    return {
      _id: ride._id,
      passengerId: ride.passengerId,

      driverId: ride.driverId,
      pickupLocation: ride.pickupLocation,
      dropoffLocation: ride.dropoffLocation,
      rideType: ride.rideType,
      status: ride.status,
      estimatedFare: ride.estimatedFare,
      finalFare: ride.finalFare,
      estimatedDistance: ride.estimatedDistance,
      estimatedDuration: ride.estimatedDuration,
      scheduledTime: ride.scheduledTime,
      passengerCount: ride.passengerCount,
      specialRequests: ride.specialRequests,
      createdAt: ride.createdAt,
      updatedAt: ride.updatedAt,
      driverAssignedAt: ride.driverAssignedAt,
      startedAt: ride.startedAt,
      completedAt: ride.completedAt,
    };
  }
}
