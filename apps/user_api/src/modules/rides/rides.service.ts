import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import {
  DriverEvpRepository,
  FirebaseNotificationService,
  PaymentMethod,
  PaymentStatus,
  RatingRepository,
  RideNotificationData,
  RideRepository,
  UserRepository,
  VEHICLE_CAPACITY,
  VehicleRepository,
  VehicleType,
  VehicleTypeRepository,
} from '@urcab-workspace/shared';
import { CreateRideDto, UpdateRideDto, RideResponseDto, VehiclePriceDto } from './dtos';
import { RideStatus, RideType } from '@urcab-workspace/shared';
import { Types } from 'mongoose';
import { DriverLocationRepository } from './repository/driver-location.repository';
import { RideWebSocketService } from './ride-websocket.service';

@Injectable()
export class RidesService {
  protected readonly logger = new Logger(RidesService.name);

  constructor(
    private readonly rideRepository: RideRepository,
    private readonly driverLocationRepository: DriverLocationRepository,
    private readonly userRepository: UserRepository,
    private readonly vehicleRepository: VehicleRepository,
    private readonly vehicleTypeRepository: VehicleTypeRepository,
    private readonly ratingRepository: RatingRepository,
    private readonly rideWebSocketService: RideWebSocketService,
    private readonly firebaseNotificationService: FirebaseNotificationService,
    private readonly driverEvpRepository: DriverEvpRepository,
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

      // 4. Validate selected driver if provided
      // if (!createRideDto.selectedDriverId) {
      //   throw new BadRequestException('Please select a driver from the available drivers list');
      // }

      // 5. Create ride request (not confirmed yet)
      const rideRequest = await this.rideRepository.create({
        passengerId,
        // selectedDriverId: new Types.ObjectId(createRideDto.selectedDriverId),
        pickupLocation: {
          type: 'Point',
          coordinates: [
            createRideDto.pickupLocation.coordinates.longitude,
            createRideDto.pickupLocation.coordinates.latitude,
          ],
          address: createRideDto.pickupLocation.address,
          placeId: createRideDto.pickupLocation.placeId,
        },
        dropoffLocation: {
          type: 'Point',
          coordinates: [
            createRideDto.dropoffLocation.coordinates.longitude,
            createRideDto.dropoffLocation.coordinates.latitude,
          ],
          address: createRideDto.dropoffLocation.address,
          placeId: createRideDto.dropoffLocation.placeId,
        },
        vehicleType: new Types.ObjectId(createRideDto.vehicleTypeId),
        rideType: createRideDto.rideType,
        scheduledTime: createRideDto.rideType === RideType.IMMEDIATE ? new Date() : createRideDto.scheduledTime,
        passengerCount: createRideDto.passengerCount || 1,
        specialRequests: createRideDto.specialRequests,
        estimatedFare: createRideDto.estimatedPrice,
        estimatedDistance: parseFloat(createRideDto.estimatedDistance.toString()),
        estimatedDuration: rideDetails.duration,
        status: RideStatus.PENDING_DRIVER_ACCEPTANCE, // New status
        // paymentMethod: PaymentMethod.CASH,
        paymentMethod: createRideDto.paymentMethod,
        paymentStatus: PaymentStatus.PENDING,
      });

      // 6. Send ride request notification to selected driver and wait for response
      // await this.sendRideRequestToSelectedDriver(rideRequest, selectedDriver, passenger);
      let dd = await this.findAndNotifyDrivers(rideRequest, passenger, createRideDto.vehicleTypeId);
      if (dd == false) {
        throw new NotFoundException(`Unable to find drivers in the area`);
      } else {
        return this.mapToResponseDto(rideRequest);
      }
      // if (dd) {
      // }
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
        const activeStatuses = [RideStatus.SEARCHING_DRIVER, RideStatus.DRIVER_ACCEPTED, RideStatus.RIDE_STARTED];

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

  // Add this method to apps/user_api/src/modules/rides/rides.service.ts

  /**
   * Get vehicle types and prices based on required capacity and distance
   */
  async getVehiclesByCapacityAndPrice(
    seatingCapacity: number,
    distance: number,
  ): Promise<{ success: boolean; data: VehiclePriceDto[] }> {
    try {
      // Calculate estimated duration based on distance
      const estimatedDuration = this.estimateDuration(distance);

      // Query the database for all active vehicle types
      const vehicleTypes = await this.vehicleTypeRepository.findActiveVehicleTypes();

      if (!vehicleTypes || vehicleTypes.length === 0) {
        this.logger.warn('No active vehicle types found in database');
        return { success: false, data: [] };
      }

      // Filter vehicle types by required capacity
      const eligibleVehicleTypes = vehicleTypes.filter((vt) => vt.capacity >= seatingCapacity);

      if (eligibleVehicleTypes.length === 0) {
        this.logger.debug(`No vehicle types found with capacity >= ${seatingCapacity}`);
        return { success: false, data: [] };
      }

      // Calculate price for each eligible vehicle type
      const vehiclePrices: VehiclePriceDto[] = eligibleVehicleTypes.map((vt) => {
        // Calculate price based on time periods
        const finalPrice = this.calculateTimeBasedFare(vt, distance);

        return {
          type: vt.name,
          capacity: vt.capacity,
          estimatedPrice: parseFloat(finalPrice.toFixed(2)),
          estimatedDuration: Math.round(estimatedDuration),
          vehicleTypeId: vt._id.toString(),
          description: vt.description,
          iconUrl: vt.iconUrl,
        };
      });

      // Sort by price (ascending)
      return {
        success: true,
        data: vehiclePrices.sort((a, b) => a.estimatedPrice - b.estimatedPrice),
      };
    } catch (error) {
      this.logger.error(`Error fetching vehicle types by capacity and price: ${error.message}`, error.stack);
      return { success: false, data: [] };
    }
  }

  /**
   * Test endpoint to calculate prices with a specific time of day
   * @param seatingCapacity Required seating capacity
   * @param distance Distance in kilometers
   * @param timeString Time in HH:MM format to simulate
   * @returns Vehicle prices at the specified time
   */
  async testPricesWithTime(
    seatingCapacity: number,
    distance: number,
    timeString: string,
  ): Promise<{ success: boolean; data: VehiclePriceDto[]; currentTime: string }> {
    try {
      // Calculate estimated duration based on distance
      const estimatedDuration = this.estimateDuration(distance);

      // Query the database for all active vehicle types
      const vehicleTypes = await this.vehicleTypeRepository.findActiveVehicleTypes();

      if (!vehicleTypes || vehicleTypes.length === 0) {
        this.logger.warn('No active vehicle types found in database');
        return { success: false, data: [], currentTime: timeString };
      }

      // Filter vehicle types by required capacity
      const eligibleVehicleTypes = vehicleTypes.filter((vt) => vt.capacity >= seatingCapacity);

      if (eligibleVehicleTypes.length === 0) {
        this.logger.debug(`No vehicle types found with capacity >= ${seatingCapacity}`);
        return { success: false, data: [], currentTime: timeString };
      }

      // Calculate price for each eligible vehicle type with the provided time
      const vehiclePrices: VehiclePriceDto[] = eligibleVehicleTypes.map((vt) => {
        // Find pricing period for the specific time
        const pricingPeriod = this.findApplicablePricingPeriod(vt.pricingPeriods, timeString);

        // Calculate price based on pricing period or fallback to default
        let finalPrice = 0;

        if (pricingPeriod) {
          // Add base fare for initial distance
          finalPrice = pricingPeriod.baseFare;

          // If distance exceeds base distance, add incremental charges
          if (distance > pricingPeriod.baseDistance) {
            const extraDistance = distance - pricingPeriod.baseDistance;
            const incrementsNeeded = Math.ceil(extraDistance / pricingPeriod.incrementalDistance);
            finalPrice += incrementsNeeded * pricingPeriod.incrementalRate;
          }
        } else {
          // Fallback if no period found
          finalPrice = this.calculateFare(distance, estimatedDuration);
        }

        return {
          type: vt.name,
          capacity: vt.capacity,
          estimatedPrice: parseFloat(finalPrice.toFixed(2)),
          estimatedDuration: Math.round(estimatedDuration),
          vehicleTypeId: vt._id.toString(),
          description: vt.description,
          iconUrl: vt.iconUrl,
          // Include pricing period info for debugging
          pricingPeriod: pricingPeriod
            ? {
                name: pricingPeriod.name,
                startTime: pricingPeriod.startTime,
                endTime: pricingPeriod.endTime,
                baseFare: pricingPeriod.baseFare,
                baseDistance: pricingPeriod.baseDistance,
                incrementalRate: pricingPeriod.incrementalRate,
                incrementalDistance: pricingPeriod.incrementalDistance,
              }
            : 'No applicable pricing period found',
        };
      });

      // Sort by price (ascending)
      return {
        success: true,
        data: vehiclePrices.sort((a, b) => a.estimatedPrice - b.estimatedPrice),
        currentTime: timeString,
      };
    } catch (error) {
      this.logger.error(`Error testing prices with time ${timeString}: ${error.message}`, error.stack);
      return { success: false, data: [], currentTime: timeString };
    }
  }

  private async sendRideRequestToSelectedDriver(
    ride: any,
    selectedDriver: any,
    passenger: any,
  ): Promise<boolean | void> {
    try {
      const { driver, driverLocation, distanceToPickup } = selectedDriver;

      // Check if driver has FCM token
      if (!driver.fcmToken) {
        throw new BadRequestException('Driver is not available for notifications');
      }

      // Create ride request object for Firebase
      const rideRequest = {
        rideId: ride._id.toString(),
        passengerId: passenger._id.toString(),
        driverId: driver._id.toString(),
        passengerName: `${passenger.firstName} ${passenger.lastName}`,
        passengerPhone: passenger.phone,
        passengerPhoto: passenger.photo,
        passengerCount: ride?.passengerCount.toString(),
        pickupLocation: {
          address: ride.pickupLocation.address ?? '',
          coordinates: ride.pickupLocation.coordinates as [number, number],
          landmark: ride.pickupLocation.landmark || '',
        },
        dropoffLocation: {
          address: ride.dropoffLocation.address,
          coordinates: ride.dropoffLocation.coordinates as [number, number],
          landmark: ride.dropoffLocation.landmark || '',
        },
        estimatedFare: ride.estimatedFare,
        estimatedDistance: ride.estimatedDistance,
        estimatedDuration: ride.estimatedDuration,
        requestTime: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30000).toISOString(), // 30 seconds
      };

      // Use Firebase service for real-time ride requests

      await this.rideWebSocketService.sendRideRequestToDriver(rideRequest, driver.fcmToken);

      this.logger.log(`Real-time ride request sent to selected driver ${driver._id} for ride ${ride._id}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send ride request to selected driver`, error.stack);
      // Fall back to finding nearby drivers
      // await this.findAndNotifyDrivers(ride, passenger);
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

  /**
   * Calculate fare using time-based pricing model from vehicle type
   * @param vehicleType The vehicle type with pricing periods
   * @param distance Distance in kilometers
   * @returns Calculated fare in RM
   */
  private calculateTimeBasedFare(vehicleType: any, distance: number): number {
    // Get current time
    const now = new Date();
    const currentTimeString =
      now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

    // Find applicable pricing period
    let applicablePeriod = this.findApplicablePricingPeriod(vehicleType.pricingPeriods, currentTimeString);

    // If no applicable period found, use a default pricing
    if (!applicablePeriod) {
      this.logger.warn(
        `No applicable pricing period found for ${vehicleType.name} at ${currentTimeString}, using fallback pricing`,
      );
      return this.calculateFare(distance, this.estimateDuration(distance));
    }

    // Calculate fare based on pricing period rules
    let fare = 0;

    // Add base fare for initial distance
    fare += applicablePeriod.baseFare;

    // If distance exceeds base distance, add incremental charges
    if (distance > applicablePeriod.baseDistance) {
      const extraDistance = distance - applicablePeriod.baseDistance;
      const incrementsNeeded = Math.ceil(extraDistance / applicablePeriod.incrementalDistance);
      fare += incrementsNeeded * applicablePeriod.incrementalRate;
    }

    return fare;
  }

  /**
   * Find the applicable pricing period for the given time
   * @param pricingPeriods Array of pricing periods from vehicle type
   * @param currentTime Current time in HH:MM format
   * @returns The applicable pricing period or null if none found
   */
  private findApplicablePricingPeriod(pricingPeriods: any[], currentTime: string): any {
    if (!pricingPeriods || pricingPeriods.length === 0) {
      return null;
    }

    // First check for exact time range match
    for (const period of pricingPeriods) {
      if (this.isTimeInRange(currentTime, period.startTime, period.endTime)) {
        return period;
      }
    }

    // If no exact match, find the closest period
    let closestPeriod = pricingPeriods[0];
    let smallestDifference = Number.MAX_SAFE_INTEGER;

    for (const period of pricingPeriods) {
      // Calculate difference from current time to period start and end
      const startDiff = this.calculateTimeDifference(currentTime, period.startTime);
      const endDiff = this.calculateTimeDifference(currentTime, period.endTime);

      // Take the smaller difference
      const minDiff = Math.min(startDiff, endDiff);

      if (minDiff < smallestDifference) {
        smallestDifference = minDiff;
        closestPeriod = period;
      }
    }

    return closestPeriod;
  }

  /**
   * Check if a time is within a given range
   * @param time Time to check (HH:MM format)
   * @param startTime Range start (HH:MM format)
   * @param endTime Range end (HH:MM format)
   * @returns Boolean indicating if time is in range
   */
  private isTimeInRange(time: string, startTime: string, endTime: string): boolean {
    // Convert all times to minutes since midnight for easy comparison
    const timeMinutes = this.timeToMinutes(time);
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);

    // Handle normal range (e.g., 09:00-17:00)
    if (startMinutes < endMinutes) {
      return timeMinutes >= startMinutes && timeMinutes < endMinutes;
    }
    // Handle overnight range (e.g., 22:00-06:00)
    else {
      return timeMinutes >= startMinutes || timeMinutes < endMinutes;
    }
  }

  /**
   * Convert time string to minutes since midnight
   * @param time Time in HH:MM format
   * @returns Minutes since midnight
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Calculate absolute difference between two times
   * @param time1 First time in HH:MM format
   * @param time2 Second time in HH:MM format
   * @returns Difference in minutes
   */
  private calculateTimeDifference(time1: string, time2: string): number {
    const minutes1 = this.timeToMinutes(time1);
    const minutes2 = this.timeToMinutes(time2);

    // Handle times across midnight
    let diff = Math.abs(minutes1 - minutes2);
    if (diff > 720) {
      // More than 12 hours difference means it's closer the other way around
      diff = 1440 - diff; // 1440 = 24 hours in minutes
    }

    return diff;
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

  async getRideByIdDriverLocation(rideId: string, userId: Types.ObjectId): Promise<any> {
    const ride = await this.rideRepository.findById(rideId);
    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    // Ensure user can access this ride (either passenger or assigned driver)
    if (!ride.passengerId.equals(userId) && (!ride.driverId || !ride.driverId.equals(userId))) {
      throw new BadRequestException('Unauthorized to access this ride');
    }

    const driverLocation = await this.driverLocationRepository.getDriverLocation(ride.driverId);

    if (!driverLocation) {
      throw new NotFoundException('Driver location not found');
    }

    return {
      success: true,
      data: driverLocation?.location,
    };
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
    if (updateRideDto.status === RideStatus.DRIVER_ACCEPTED) {
      updateData.driverAssignedAt = new Date();
      updateData.driverId = userId; // Assuming the user updating is the driver
    }

    if (updateRideDto.status === RideStatus.RIDE_STARTED) {
      updateData.startedAt = new Date();
    }

    if (updateRideDto.status === RideStatus.RIDE_COMPLETED) {
      updateData.completedAt = new Date();
    }

    const updatedRide = await this.rideRepository.findByIdAndUpdate(rideId, updateData);
    return this.mapToResponseDto(updatedRide);
  }

  private validateStatusChange(currentStatus: RideStatus, newStatus: RideStatus): void {
    const validTransitions: Record<RideStatus, RideStatus[]> = {
      [RideStatus.SEARCHING_DRIVER]: [
        RideStatus.PENDING_DRIVER_ACCEPTANCE,
        RideStatus.DRIVER_ACCEPTED,
        RideStatus.RIDE_CANCELLED,
        RideStatus.RIDE_TIMEOUT,
      ],
      [RideStatus.PENDING_DRIVER_ACCEPTANCE]: [
        RideStatus.DRIVER_ACCEPTED,
        RideStatus.REJECTED_BY_DRIVER,
        RideStatus.RIDE_CANCELLED,
        RideStatus.RIDE_TIMEOUT,
      ],
      [RideStatus.REJECTED_BY_DRIVER]: [RideStatus.PENDING_DRIVER_ACCEPTANCE, RideStatus.RIDE_CANCELLED],
      [RideStatus.SCHEDULED]: [RideStatus.SEARCHING_DRIVER, RideStatus.RIDE_CANCELLED],
      [RideStatus.DRIVER_ACCEPTED]: [RideStatus.RIDE_STARTED, RideStatus.RIDE_CANCELLED, RideStatus.RIDE_TIMEOUT],
      [RideStatus.RIDE_STARTED]: [RideStatus.RIDE_COMPLETED, RideStatus.RIDE_CANCELLED],
      [RideStatus.DRIVER_AT_PICKUPLOCATION]: [
        RideStatus.RIDE_COMPLETED,
        RideStatus.RIDE_CANCELLED,
        RideStatus.RIDE_TIMEOUT,
      ],
      [RideStatus.DRIVER_HAS_PICKUP_PASSENGER]: [
        RideStatus.RIDE_COMPLETED,
        RideStatus.RIDE_CANCELLED,
        RideStatus.RIDE_TIMEOUT,
      ],
      [RideStatus.RIDE_COMPLETED]: [RideStatus.RIDE_CANCELLED, RideStatus.RIDE_TIMEOUT],
      [RideStatus.RIDE_CANCELLED]: [RideStatus.RIDE_TIMEOUT],
      [RideStatus.RIDE_TIMEOUT]: [],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }

  async getPassengerCurrentRide(passengerId: Types.ObjectId): Promise<any | null> {
    try {
      const currentRide = await this.rideRepository.findPassengerCurrentRide(passengerId);
      const passenger = await this.userRepository.findById(passengerId.toString());
      const driver = await this.userRepository.findById(currentRide?.selectedDriverId?.toString());
      const vehicle = await this.vehicleRepository.findOne({
        // _id: ride.vehicleId,
        driverId: currentRide?.selectedDriverId?.toString(),
        isPrimary: true,
      });
      const rating = await this.ratingRepository.getAverageRating(currentRide?.selectedDriverId?.toString());

      // console.log(currentRide, '=====curemt ride====');
      return currentRide
        ? {
            ...this.mapToResponseDto(currentRide),
            driverInfo: { passenger, driver, driverRating: rating, driverVehicle: vehicle },
          }
        : null;
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
    const canCancel = ride.passengerId._id.equals(userId) || (ride.driverId && ride.driverId._id.equals(userId));

    if (!canCancel) {
      throw new BadRequestException('Unauthorized to cancel this ride');
    }

    // Check if ride can be cancelled
    if ([RideStatus.RIDE_COMPLETED, RideStatus.RIDE_CANCELLED].includes(ride.status as RideStatus)) {
      throw new BadRequestException('Cannot cancel a completed or already cancelled ride');
    }

    const passenger = await this.userRepository.findById(ride.passengerId?._id.toString());
    const driver = await this.userRepository.findById(ride.driverId._id.toString());

    const updateData = {
      status: RideStatus.RIDE_CANCELLED,
      cancelledAt: new Date(),
      cancelledBy: userId,
      cancellationReason: reason || 'Cancelled by passenger',
    };

    const updatedRide = await this.rideRepository.findByIdAndUpdate(rideId, updateData);
    if (passenger?.fcmToken) {
      await this.firebaseNotificationService.sendRideStatusUpdate(
        passenger.fcmToken,
        RideStatus.RIDE_CANCELLED,
        rideId,
        driver,
        updatedRide,
      );
    }

    return this.mapToResponseDto(updatedRide);
  }

  private async findAndNotifyDrivers(ride: any, passenger: any, vehicleType: string): Promise<boolean | void> {
    // console.log(ride, '=====ride====', passenger, '=====passenger====', vehicleType, '=====vehicleType====');
    try {
      // Get pickup location coordinates
      const pickupCoords = ride.pickupLocation.coordinates;
      const [longitude, latitude] = pickupCoords;

      // Find nearby available drivers within expanding radius
      let nearbyDrivers = [];
      const searchRadiuses = [2, 3, 4, 5, 6, 7, 8]; // km

      for (const radius of searchRadiuses) {
        nearbyDrivers = await this.driverLocationRepository.findNearbyDriversWithVehicles(
          longitude,
          latitude,
          radius,
          10,
          ride.passengerCount,
          vehicleType,
        );

        if (nearbyDrivers.length > 0) {
          this.logger.log(`Found ${nearbyDrivers.length} drivers within ${radius}km for ride ${ride._id}`);
          break;
        }
      }

      // console.log(nearbyDrivers, '=====nearbyDrivers====');
      if (nearbyDrivers.length === 0) {
        this.logger.warn(`No drivers found near pickup location for ride ${ride._id}`);
        // Update ride status to indicate no drivers available
        const updatedRide = await this.rideRepository.findByIdAndUpdate(ride._id.toString(), {
          status: RideStatus.RIDE_CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: 'No drivers available in the area',
        });

        // if (passenger?.fcmToken) {
        //   await this.firebaseNotificationService.sendRideStatusUpdate(
        //     passenger.fcmToken,
        //     RideStatus.RIDE_CANCELLED,
        //     ride._id.toString(),
        //     null,
        //     updatedRide,
        //     'No drivers available in the area',
        //   );
        // }
        return false;
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

          // Check if driver has a valid EVP
          const driverEvp = await this.driverEvpRepository.findDriverActiveEvp(driverLocation.driverId);
          if (!driverEvp) {
            this.logger.warn(`Driver ${driverLocation.driverId} has no active EVP - skipping notification`);
            continue;
          }

          // Check if EVP is valid (not expired)
          const now = new Date();
          if (driverEvp.endDate < now) {
            this.logger.warn(`Driver ${driverLocation.driverId} has an expired EVP - skipping notification`);
            continue;
          }

          // Additional validation from original function
          const selectedDriver = await this.validateSelectedDriver(
            driverLocation.driverId.toString(),
            ride.pickupLocation.coordinates,
          );

          let sent = await this.sendRideRequestToSelectedDriver(ride, selectedDriver, passenger);

          // const sent = await this.firebaseNotificationService.sendRideRequestToDriver(
          //   driver.fcmToken,
          //   driver._id,
          //   notificationData,
          // );

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

  // async getNearbyDrivers(longitude: number, latitude: number, radius: number = 10): Promise<any[]> {
  //   // console.log(longitude, latitude, radius, '=====radius===');
  //   return await this.driverLocationRepository.findNearbyDriversWithVehicles(longitude, latitude, radius, 20);
  //   // return await this.driverLocationRepository.findNearbyDriversWithVehiclesUsingGeoWithin(
  //   //   longitude,
  //   //   latitude,
  //   //   radius,
  //   //   20,
  //   // );
  // }

  async findNearbyDrivers(
    longitude: number,
    latitude: number,
    radiusInKm: number = 10,
    limit: number = 20,
    passenger: number,
    vehicleTypeId?: Types.ObjectId | string,
  ): Promise<any> {
    try {
      this.logger.debug(`Searching for drivers near [${longitude}, ${latitude}] within ${radiusInKm}km`);

      const nearbyDrivers = await this.driverLocationRepository.findNearbyDriversWithVehicles(
        longitude,
        latitude,
        radiusInKm,
        limit,
        passenger,
        vehicleTypeId,
      );

      this.logger.log(`Found ${nearbyDrivers.length} nearby drivers before EVP validation`);

      // Filter drivers to only include those with valid EVPs
      const driversWithValidEvp = [];
      for (const driver of nearbyDrivers) {
        // Check if driver has a valid EVP
        const driverEvp = await this.driverEvpRepository.findDriverActiveEvp(driver.driverId);
        if (!driverEvp) {
          this.logger.warn(`Driver ${driver.driverId} has no active EVP - excluding from results`);
          continue;
        }

        // Check if EVP is valid (not expired)
        const now = new Date();
        if (driverEvp.endDate < now) {
          this.logger.warn(`Driver ${driver.driverId} has an expired EVP - excluding from results`);
          continue;
        }

        driversWithValidEvp.push(driver);
      }

      this.logger.log(`Found ${driversWithValidEvp.length} nearby drivers with valid EVPs`);

      if (driversWithValidEvp.length === 0) {
        // Run debug search to understand why no drivers were found
        const debugInfo = await this.driverLocationRepository.debugNearbyDriverSearch(longitude, latitude, radiusInKm);
        this.logger.warn('No drivers found with valid EVPs, debug info:', debugInfo);
      }

      return {
        success: true,
        data: driversWithValidEvp.map((driver) => this.mapToNearbyDriverResponseDto(driver)),
      };
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
    };
  }
}
