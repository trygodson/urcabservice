import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import {
  FirebaseNotificationService,
  PaymentMethod,
  PaymentStatus,
  RideNotificationData,
  RideRepository,
  UserRepository,
} from '@urcab-workspace/shared';
import { CreateRideDto, UpdateRideDto, RideResponseDto } from './dtos';
import { RideStatus, RideType } from '@urcab-workspace/shared';
import { Types } from 'mongoose';
import { DriverLocationRepository } from './repository/driver-location.repository';

@Injectable()
export class RidesService {
  protected readonly logger = new Logger(RidesService.name);

  constructor(
    private readonly rideRepository: RideRepository,
    private readonly driverLocationRepository: DriverLocationRepository,
    private readonly userRepository: UserRepository,
    private readonly firebaseNotificationService: FirebaseNotificationService,
  ) {}

  async bookRide(passengerId: Types.ObjectId, createRideDto: CreateRideDto): Promise<RideResponseDto> {
    try {
      await this.validateNoActiveRide(passengerId);
      // 1. Validate locations
      await this.validateLocations(createRideDto.pickupLocation, createRideDto.dropoffLocation);

      // 2. Validate scheduled time for scheduled rides
      if (createRideDto.rideType === RideType.SCHEDULED) {
        this.validateScheduledTime(createRideDto.scheduledTime);
      }

      // 3. Calculate distance and estimated fare
      const rideDetails = await this.calculateRideDetails(createRideDto.pickupLocation, createRideDto.dropoffLocation);

      const passenger = await this.userRepository.findOneWithDocument({ _id: passengerId });
      if (!passenger) {
        throw new NotFoundException('Passenger not found');
      }

      // 5. If a specific driver is selected, validate driver availability
      let selectedDriver = null;
      if (createRideDto.selectedDriverId) {
        selectedDriver = await this.validateSelectedDriver(
          createRideDto.selectedDriverId,
          createRideDto.pickupLocation.coordinates,
        );
      }

      // 4. Create ride record
      const ride = await this.rideRepository.create({
        passengerId,
        pickupLocation: {
          type: 'Point',
          coordinates: [
            createRideDto.pickupLocation.coordinates.longitude,
            createRideDto.pickupLocation.coordinates.latitude,
          ],
          address: createRideDto.pickupLocation.address.formatted,
          placeId: createRideDto.pickupLocation.placeId,
          landmark: createRideDto.pickupLocation.landmark,
        },
        dropoffLocation: {
          type: 'Point',
          coordinates: [
            createRideDto.dropoffLocation.coordinates.longitude,
            createRideDto.dropoffLocation.coordinates.latitude,
          ],
          address: createRideDto.dropoffLocation.address.formatted,
          placeId: createRideDto.dropoffLocation.placeId,
          landmark: createRideDto.dropoffLocation.landmark,
        },
        rideType: createRideDto.rideType,
        scheduledTime: createRideDto.scheduledTime,
        passengerCount: createRideDto.passengerCount || 1,
        specialRequests: createRideDto.specialRequests,
        estimatedFare: rideDetails.estimatedFare,
        estimatedDistance: rideDetails.distance,
        estimatedDuration: rideDetails.duration,
        status: createRideDto.rideType === RideType.IMMEDIATE ? RideStatus.SEARCHING_DRIVER : RideStatus.SCHEDULED,
        paymentMethod: PaymentMethod.CASH,
        paymentStatus: PaymentStatus.PENDING,
      });

      // 7. Handle immediate rides
      if (createRideDto.rideType === RideType.IMMEDIATE) {
        if (selectedDriver) {
          // Send notification to selected driver
          await this.sendRideRequestToSelectedDriver(ride, selectedDriver, passenger);
        } else {
          // Find and notify nearby drivers
          await this.findAndNotifyDrivers(ride, passenger);
        }
      }
      return this.mapToResponseDto(ride);
    } catch (error) {
      throw new BadRequestException(`Failed to book ride: ${error.message}`);
    }
  }

  private async validateNoActiveRide(passengerId: Types.ObjectId): Promise<void> {
    try {
      this.logger.debug(`Checking for active rides for passenger ${passengerId}`);

      // Check if passenger has any active ride
      const activeRide = await this.rideRepository.findPassengerCurrentRide(passengerId);

      if (activeRide) {
        const activeStatuses = [RideStatus.SEARCHING_DRIVER, RideStatus.DRIVER_ASSIGNED, RideStatus.STARTED];

        if (activeStatuses.includes(activeRide.status as RideStatus)) {
          this.logger.warn(
            `Passenger ${passengerId} already has active ride ${activeRide._id} with status: ${activeRide.status}`,
          );

          // Return detailed information about the active ride
          throw new BadRequestException(
            `You already have an active ride (${activeRide.status.toLowerCase().replace('_', ' ')}). ` +
              `Please complete or cancel your current ride before booking a new one. ` +
              `Ride ID: ${activeRide._id}`,
          );
        }

        // Also check for scheduled rides that are close to their scheduled time (within 30 minutes)
        if (activeRide.status === RideStatus.SCHEDULED && activeRide.scheduledTime) {
          const now = new Date();
          const scheduledTime = new Date(activeRide.scheduledTime);
          const timeDifference = scheduledTime.getTime() - now.getTime();
          const minutesDifference = timeDifference / (1000 * 60);

          // If scheduled ride is within 30 minutes, don't allow new booking
          if (minutesDifference <= 30 && minutesDifference > -15) {
            // -15 allows for some grace period after scheduled time
            this.logger.warn(`Passenger ${passengerId} has scheduled ride ${activeRide._id} within 30 minutes`);

            throw new BadRequestException(
              `You have a scheduled ride at ${scheduledTime.toLocaleString()} which is too close to book another ride. ` +
                `Please wait until after your scheduled ride or cancel it first. ` +
                `Ride ID: ${activeRide._id}`,
            );
          }
        }
      }

      this.logger.debug(`No active rides found for passenger ${passengerId}`);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to validate active rides for passenger ${passengerId}`, error.stack);
      throw new BadRequestException('Failed to validate ride eligibility');
    }
  }
  private async validateSelectedDriver(driverId: string, pickupCoordinates: any): Promise<any> {
    try {
      // Check if driver exists and is active
      const driver = await this.userRepository.findById(driverId);
      if (!driver || !driver.isActive || driver.type !== 2) {
        throw new BadRequestException('Selected driver is not available');
      }

      // Check driver location and availability
      const driverLocation = await this.driverLocationRepository.getDriverLocation(new Types.ObjectId(driverId));
      if (!driverLocation) {
        throw new BadRequestException('Driver location not found');
      }

      // Validate driver is online and available
      if (driverLocation.status !== 'online' || !driverLocation.isAvailableForRides) {
        throw new BadRequestException('Selected driver is not available for rides');
      }

      // Check if driver is within reasonable distance (20km)
      const distanceToPickup = this.calculateDistance(
        {
          longitude: driverLocation.location.coordinates[0],
          latitude: driverLocation.location.coordinates[1],
        },
        pickupCoordinates,
      );

      if (distanceToPickup > 20) {
        throw new BadRequestException('Selected driver is too far from pickup location');
      }

      return {
        driver,
        driverLocation,
        distanceToPickup,
      };
    } catch (error) {
      this.logger.error(`Driver validation failed for ${driverId}`, error.stack);
      throw error;
    }
  }

  private async sendRideRequestToSelectedDriver(ride: any, selectedDriver: any, passenger: any): Promise<void> {
    try {
      const { driver, driverLocation, distanceToPickup } = selectedDriver;

      // Check if driver has FCM token
      if (!driver.fcmToken) {
        throw new BadRequestException('Driver is not available for notifications');
      }

      // Calculate estimated arrival time to pickup
      const estimatedArrivalTime = Math.ceil((distanceToPickup / 30) * 60); // 30 km/h average speed

      const notificationData: RideNotificationData = {
        rideId: ride._id.toString(),
        passengerId: passenger._id.toString(),
        passengerName: `${passenger.firstName} ${passenger.lastName}`,
        passengerPhone: passenger.phone,
        pickupLocation: {
          address: ride.pickupLocation.address,
          coordinates: ride.pickupLocation.coordinates,
          landmark: ride.pickupLocation.landmark,
        },
        dropoffLocation: {
          address: ride.dropoffLocation.address,
          coordinates: ride.dropoffLocation.coordinates,
          landmark: ride.dropoffLocation.landmark,
        },
        estimatedFare: ride.estimatedFare,
        estimatedDistance: ride.estimatedDistance,
        estimatedDuration: ride.estimatedDuration,
        distanceToPickup,
        estimatedArrivalTime,
      };

      const notificationSent = await this.firebaseNotificationService.sendRideRequestToDriver(
        driver.fcmToken,
        driver._id,
        notificationData,
      );

      if (!notificationSent) {
        this.logger.log(`Failed to send notification to selected driver ${driver._id}`);
        // Fall back to finding nearby drivers
        await this.findAndNotifyDrivers(ride, passenger);
      } else {
        // Set a timeout to auto-assign if driver doesn't respond within 30 seconds
        setTimeout(async () => {
          try {
            const currentRide = await this.rideRepository.findById(ride._id.toString());
            if (currentRide && currentRide.status === RideStatus.SEARCHING_DRIVER) {
              this.logger.warn(
                `Driver ${driver._id} did not respond to ride request ${ride._id}, finding alternatives`,
              );
              await this.findAndNotifyDrivers(currentRide, passenger);
            }
          } catch (error) {
            this.logger.error(`Error in driver response timeout for ride ${ride._id}`, error.stack);
          }
        }, 30000); // 30 seconds timeout
      }

      this.logger.log(`Ride request sent to selected driver ${driver._id} for ride ${ride._id}`);
    } catch (error) {
      this.logger.error(`Failed to send ride request to selected driver`, error.stack);
      // Fall back to finding nearby drivers
      await this.findAndNotifyDrivers(ride, passenger);
    }
  }

  private validateScheduledTime(scheduledTime?: Date): void {
    if (!scheduledTime) {
      throw new BadRequestException('Scheduled time is required for scheduled rides');
    }

    const now = new Date();
    const minimumScheduleTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
    const maximumScheduleTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    if (scheduledTime < minimumScheduleTime) {
      throw new BadRequestException('Scheduled time must be at least 30 minutes from now');
    }

    if (scheduledTime > maximumScheduleTime) {
      throw new BadRequestException('Cannot schedule rides more than 7 days in advance');
    }
  }

  private async validateLocations(pickup: any, dropoff: any): Promise<void> {
    // 1. Validate coordinates are within service area
    if (!this.isWithinServiceArea(pickup.coordinates) || !this.isWithinServiceArea(dropoff.coordinates)) {
      throw new BadRequestException('Location is outside service area');
    }

    // 2. Validate minimum distance between pickup and dropoff
    const distance = this.calculateDistance(pickup.coordinates, dropoff.coordinates);
    if (distance < 0.5) {
      // Minimum 500 meters
      throw new BadRequestException('Pickup and dropoff locations are too close (minimum 500m)');
    }

    // 3. Validate maximum distance
    if (distance > 100) {
      // Maximum 100 km
      throw new BadRequestException('Ride distance exceeds maximum limit (100km)');
    }
  }

  private async calculateRideDetails(pickup: any, dropoff: any) {
    // Use Google Maps API or similar service for accurate calculations
    const distance = this.calculateDistance(pickup.coordinates, dropoff.coordinates);
    const duration = this.estimateDuration(distance);
    const estimatedFare = this.calculateFare(distance, duration);

    return {
      distance: parseFloat(distance.toFixed(2)),
      duration: Math.ceil(duration),
      estimatedFare: parseFloat(estimatedFare.toFixed(2)),
    };
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
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private estimateDuration(distance: number): number {
    // Basic estimation: assume average speed of 30 km/h in city
    const avgSpeed = 30; // km/h
    return (distance / avgSpeed) * 60; // Convert to minutes
  }

  private calculateFare(distance: number, duration: number): number {
    // Malaysian taxi fare structure example
    const baseFare = 3.0; // RM 3 base fare
    const distanceRate = 1.25; // RM 1.25 per km
    const timeRate = 0.25; // RM 0.25 per minute during traffic

    return baseFare + distance * distanceRate + duration * timeRate;
  }

  private isWithinServiceArea(coordinates: { longitude: number; latitude: number }): boolean {
    // Define service area boundaries for Malaysia
    const malaysiaBounds = {
      north: 7.0,
      south: 0.8,
      east: 119.3,
      west: 99.6,
    };

    return (
      coordinates.latitude >= malaysiaBounds.south &&
      coordinates.latitude <= malaysiaBounds.north &&
      coordinates.longitude >= malaysiaBounds.west &&
      coordinates.longitude <= malaysiaBounds.east
    );
  }

  async getRideById(rideId: string, userId: Types.ObjectId): Promise<RideResponseDto> {
    const ride = await this.rideRepository.findById(rideId);
    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    // Ensure user can access this ride (either passenger or assigned driver)
    if (!ride.passengerId.equals(userId) && (!ride.driverId || !ride.driverId.equals(userId))) {
      throw new BadRequestException('Unauthorized to access this ride');
    }

    return this.mapToResponseDto(ride);
  }

  async updateRide(rideId: string, updateRideDto: UpdateRideDto, userId: Types.ObjectId): Promise<RideResponseDto> {
    const ride = await this.rideRepository.findById(rideId);
    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    // Additional validation based on status change
    if (updateRideDto.status) {
      this.validateStatusChange(ride.status as RideStatus, updateRideDto.status);
    }

    const updateData: any = { ...updateRideDto };

    // Set timestamps based on status
    if (updateRideDto.status === RideStatus.DRIVER_ASSIGNED) {
      updateData.driverAssignedAt = new Date();
      updateData.driverId = userId; // Assuming the user updating is the driver
    }

    if (updateRideDto.status === RideStatus.STARTED) {
      updateData.startedAt = new Date();
    }

    if (updateRideDto.status === RideStatus.COMPLETED) {
      updateData.completedAt = new Date();
    }

    const updatedRide = await this.rideRepository.findByIdAndUpdate(rideId, updateData);
    return this.mapToResponseDto(updatedRide);
  }

  private validateStatusChange(currentStatus: RideStatus, newStatus: RideStatus): void {
    const validTransitions: Record<RideStatus, RideStatus[]> = {
      [RideStatus.SEARCHING_DRIVER]: [RideStatus.DRIVER_ASSIGNED, RideStatus.CANCELLED],
      [RideStatus.SCHEDULED]: [RideStatus.SEARCHING_DRIVER, RideStatus.CANCELLED],
      [RideStatus.DRIVER_ASSIGNED]: [RideStatus.STARTED, RideStatus.CANCELLED],
      [RideStatus.STARTED]: [RideStatus.COMPLETED, RideStatus.CANCELLED],
      [RideStatus.COMPLETED]: [],
      [RideStatus.CANCELLED]: [],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }

  async getPassengerCurrentRide(passengerId: Types.ObjectId): Promise<RideResponseDto | null> {
    try {
      const currentRide = await this.rideRepository.findPassengerCurrentRide(passengerId);
      return currentRide ? this.mapToResponseDto(currentRide) : null;
    } catch (error) {
      this.logger.error(`Failed to get current ride for passenger ${passengerId}`, error.stack);
      throw new BadRequestException('Failed to get current ride');
    }
  }
  async getPassengerRideHistory(
    passengerId: Types.ObjectId,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ rides: RideResponseDto[]; total: number; page: number; limit: number }> {
    const result = await this.rideRepository.findPassengerRides(passengerId, page, limit);

    return {
      rides: result.rides.map((ride) => this.mapToResponseDto(ride)),
      total: result.total,
      page,
      limit,
    };
  }

  async getDriverRideHistory(
    driverId: Types.ObjectId,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ rides: RideResponseDto[]; total: number; page: number; limit: number }> {
    const result = await this.rideRepository.findDriverRides(driverId, page, limit);

    return {
      rides: result.rides.map((ride) => this.mapToResponseDto(ride)),
      total: result.total,
      page,
      limit,
    };
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

  async cancelRide(rideId: string, userId: Types.ObjectId, reason?: string): Promise<RideResponseDto> {
    const ride = await this.rideRepository.findById(rideId);
    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    // Check if user can cancel this ride
    const canCancel = ride.passengerId.equals(userId) || (ride.driverId && ride.driverId.equals(userId));

    if (!canCancel) {
      throw new BadRequestException('Unauthorized to cancel this ride');
    }

    // Check if ride can be cancelled
    if ([RideStatus.COMPLETED, RideStatus.CANCELLED].includes(ride.status as RideStatus)) {
      throw new BadRequestException('Cannot cancel a completed or already cancelled ride');
    }

    const updateData = {
      status: RideStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelledBy: userId,
      cancellationReason: reason,
    };

    const updatedRide = await this.rideRepository.findByIdAndUpdate(rideId, updateData);
    return this.mapToResponseDto(updatedRide);
  }

  private async findAndNotifyDrivers(ride: any, passenger: any): Promise<void> {
    try {
      // Get pickup location coordinates
      const pickupCoords = ride.pickupLocation.coordinates;
      const [longitude, latitude] = pickupCoords;

      // Find nearby available drivers within expanding radius
      let nearbyDrivers = [];
      const searchRadiuses = [2, 3, 4, 5, 6]; // km

      for (const radius of searchRadiuses) {
        nearbyDrivers = await this.driverLocationRepository.findNearbyDriversWithVehicles(
          longitude,
          latitude,
          radius,
          10, // max 10 drivers per search
        );

        if (nearbyDrivers.length > 0) {
          this.logger.log(`Found ${nearbyDrivers.length} drivers within ${radius}km for ride ${ride._id}`);
          break;
        }
      }

      if (nearbyDrivers.length === 0) {
        this.logger.warn(`No drivers found near pickup location for ride ${ride._id}`);
        // Update ride status to indicate no drivers available
        await this.rideRepository.findByIdAndUpdate(ride._id.toString(), {
          status: RideStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: 'No drivers available in the area',
        });
        return;
      }

      // Send notifications to nearby drivers (max 5 at a time)
      const driversToNotify = nearbyDrivers.slice(0, 5);
      let notificationsSent = 0;

      for (const driverLocation of driversToNotify) {
        try {
          // Get driver details
          const driver = await this.userRepository.findById(driverLocation.driverId.toString());
          if (!driver || !driver.fcmToken) {
            continue;
          }

          const notificationData: RideNotificationData = {
            rideId: ride._id.toString(),
            passengerId: passenger._id.toString(),
            passengerName: `${passenger.firstName} ${passenger.lastName}`,
            passengerPhone: passenger.phone,
            pickupLocation: {
              address: ride.pickupLocation.address,
              coordinates: ride.pickupLocation.coordinates,
              landmark: ride.pickupLocation.landmark,
            },
            dropoffLocation: {
              address: ride.dropoffLocation.address,
              coordinates: ride.dropoffLocation.coordinates,
              landmark: ride.dropoffLocation.landmark,
            },
            estimatedFare: ride.estimatedFare,
            estimatedDistance: ride.estimatedDistance,
            estimatedDuration: ride.estimatedDuration,
            distanceToPickup: driverLocation.distanceInKm || 0,
            estimatedArrivalTime: Math.ceil(((driverLocation.distanceInKm || 0) / 30) * 60),
          };

          const sent = await this.firebaseNotificationService.sendRideRequestToDriver(
            driver.fcmToken,
            driver._id,
            notificationData,
          );

          if (sent) {
            notificationsSent++;
          }
        } catch (notificationError) {
          this.logger.error(
            `Failed to send notification to driver ${driverLocation.driverId}`,
            notificationError.stack,
          );
        }
      }

      if (notificationsSent === 0) {
        this.logger.error(`Failed to send notifications to any drivers for ride ${ride._id}`);
        // Update ride status to indicate notification failure
        // await this.rideRepository.findByIdAndUpdate(ride._id.toString(), {
        //   status: RideStatus.CANCELLED,
        //   cancelledAt: new Date(),
        //   cancellationReason: 'Unable to notify drivers',
        // });
      } else {
        this.logger.log(`Sent ${notificationsSent} ride request notifications for ride ${ride._id}`);
      }
    } catch (error) {
      this.logger.error(`Failed to find and notify drivers for ride ${ride._id}`, error.stack);
      throw error;
    }
  }

  async getNearbyDrivers(longitude: number, latitude: number, radius: number = 10): Promise<any[]> {
    // console.log(longitude, latitude, radius, '=====radius===');
    return await this.driverLocationRepository.findNearbyDriversWithVehicles(longitude, latitude, radius, 20);
    // return await this.driverLocationRepository.findNearbyDriversWithVehiclesUsingGeoWithin(
    //   longitude,
    //   latitude,
    //   radius,
    //   20,
    // );
  }

  async findNearbyDrivers(
    longitude: number,
    latitude: number,
    radiusInKm: number = 10,
    limit: number = 20,
  ): Promise<any> {
    try {
      this.logger.debug(`Searching for drivers near [${longitude}, ${latitude}] within ${radiusInKm}km`);

      const nearbyDrivers = await this.driverLocationRepository.findNearbyDriversWithVehicles(
        longitude,
        latitude,
        radiusInKm,
        limit,
      );

      this.logger.log(`Found ${nearbyDrivers.length} nearby drivers`);

      if (nearbyDrivers.length === 0) {
        // Run debug search to understand why no drivers were found
        const debugInfo = await this.driverLocationRepository.debugNearbyDriverSearch(longitude, latitude, radiusInKm);
        this.logger.warn('No drivers found, debug info:', debugInfo);
      }

      return nearbyDrivers.map((driver) => this.mapToNearbyDriverResponseDto(driver));
    } catch (error) {
      this.logger.error(`Failed to find nearby drivers near [${longitude}, ${latitude}]`, error.stack);
      throw new BadRequestException('Failed to find nearby drivers');
    }
  }

  private mapToNearbyDriverResponseDto(driver: any): any {
    // Fix the distance field name
    const distanceKm = driver.distanceInKm || driver.distance || 0;
    const estimatedArrivalTime = Math.round((distanceKm / 30) * 60); // 30 km/h average speed

    return {
      success: true,
      data: {
        driverId: driver.driverId.toString(),
        location: driver.location,
        status: driver.status,
        distance: Math.round(distanceKm * 100) / 100,
        distanceInKm: distanceKm,
        distanceInMeters: driver.distanceInMeters,
        lastLocationUpdate: driver.lastLocationUpdate,
        driver: {
          firstName: driver.driver.firstName,
          lastName: driver.driver.lastName,
          phone: driver.driver.phone,
          photo: driver.driver.photo,
          email: driver.driver.email,
          rating: driver.driver.rating,
          totalRides: driver.driver.totalRides,
        },
        vehicle: {
          make: driver.vehicle.make,
          model: driver.vehicle.model,
          year: driver.vehicle.year,
          color: driver.vehicle.color,
          licensePlate: driver.vehicle.licensePlate,
          seatingCapacity: driver.vehicle.seatingCapacity,
          vehicleType: driver.vehicle.vehicleType,
        },
        heading: driver.heading,
        speed: driver.speed,
        estimatedArrivalTime,
      },
    };
  }
}
