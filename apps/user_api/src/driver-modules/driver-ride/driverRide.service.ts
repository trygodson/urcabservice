import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  BalanceType,
  DriverEvpRepository,
  DriverOnlineStatus,
  FirebaseNotificationService,
  generateRandomString,
  PaymentMethod,
  PaymentStatus,
  RatingRepository,
  RideRepository,
  RideStatus,
  SubscriptionRepository,
  TransactionCategory,
  TransactionStatus,
  TransactionType,
  User,
  UserRepository,
  VehicleRepository,
  WalletRepository,
  WalletTransaction,
} from '@urcab-workspace/shared';
import { RideResponseDto } from 'apps/user_api/src/modules/rides/dtos';
import { Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DriverLocationRepository } from './repository/driver-location.repository';
import { DriverRideRepository } from './repository/driverRide.repository';
import { FirebaseRideService } from '../../modules/rides/firebase-ride.service';
import { RedisService } from '../../modules/rides/redis.service';
import { Inject, forwardRef } from '@nestjs/common';
import { RidesService } from '../../modules/rides/rides.service';

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
    private readonly vehicleRepository: VehicleRepository,
    private readonly ratingRepository: RatingRepository,
    private readonly firebaseNotificationService: FirebaseNotificationService,
    private readonly firebaseRideService: FirebaseRideService,
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly walletRepository: WalletRepository,
    private readonly driverEvpRepository: DriverEvpRepository,
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => RidesService)) private readonly ridesService: RidesService,
    @InjectModel(WalletTransaction.name) private readonly transactionModel: Model<WalletTransaction>,
  ) {}

  async acceptRide(
    rideId: string,
    driverId: Types.ObjectId,
    currentLocation: { latitude: number; longitude: number },
  ): Promise<RideResponseDto> {
    // console.log(currentLocation, '=====currentLocation====');
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

      // Ensure driver has an active (paid) subscription before accepting rides
      const hasActiveSubscription = await this.subscriptionRepository.hasActiveSubscription(driverId.toString());
      if (!hasActiveSubscription) {
        throw new BadRequestException('You need an active subscription to accept ride requests.');
      }

      const driver = await this.userRepository.findById(driverId.toString());
      const passenger = await this.userRepository.findById(ride.passengerId._id.toString());
      const vehicle = await this.vehicleRepository.findOne(
        {
          driverId: driverId.toString(),
          isPrimary: true,
        },
        ['vehicleTypeId'],
      );
      const vehicleEvp = await this.driverEvpRepository.findOne({
        vehicleId: vehicle._id,
        isActive: true,
      });
      const rating = await this.ratingRepository.getAverageRating(driverId.toString());

      const updatedRide = await this.rideRepository.findByIdAndUpdate(rideId, {
        driverId,
        status: RideStatus.DRIVER_ACCEPTED,
        selectedDriverId: driverId,
        selectedVehicleId: vehicle._id,
        driverAssignedAt: new Date(),
      });

      // Clear driver queue since ride is accepted
      await this.redisService.clearDriverQueue(rideId);

      // Create wallet transaction for the ride (status: PENDING)
      await this.createRideTransaction(
        rideId,
        ride.passengerId._id.toString(),
        driverId.toString(),
        ride.estimatedFare || 0,
        ride.paymentMethod,
        passenger,
      );

      // Update driver availability

      await this.driverLocationRepository.updateDriverStatus(driverId, DriverOnlineStatus.BUSY, false, rideId);

      // Get driver details for notification

      // Send notification to passenger
      if (passenger?.fcmToken) {
        await this.firebaseNotificationService.sendRideStatusUpdate(
          passenger.fcmToken,
          'DRIVER_ACCEPTED',
          rideId,
          { ...driver, vehicle, rating, currentLocation, vehicleEvp },
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
      // console.log(nearbyRides, '=====nearbyrides=====');
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
            passengerName: `${passenger.fullName}`,
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
      const passenger = await this.userRepository.findById(ride.passengerId?._id._id.toString());
      const driver = await this.userRepository.findById(driverId.toString());
      const vehicle = await this.vehicleRepository.findOne(
        {
          // _id: ride.vehicleId,
          driverId: driverId.toString(),
          isPrimary: true,
        },
        ['vehicleTypeId'],
      );
      const rating = await this.ratingRepository.getAverageRating(driverId.toString());
      const vehicleEvp = await this.driverEvpRepository.findOne({
        vehicleId: vehicle._id,
        isActive: true,
      });
      // Update ride status
      const updatedRide = await this.rideRepository.findByIdAndUpdate(rideId, {
        status: RideStatus.DRIVER_AT_PICKUPLOCATION,
        startedAt: new Date(),
      });
      // console.log(updatedRide, '=====updatedRide====', ride);
      // Get passenger and driver details for notifications
      // Send notification to passenger
      if (passenger?.fcmToken) {
        await this.firebaseNotificationService.sendRideStatusUpdate(
          passenger.fcmToken,
          RideStatus.DRIVER_AT_PICKUPLOCATION,
          rideId,
          { ...driver, vehicle, rating, vehicleEvp },
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
      const passenger = await this.userRepository.findById(ride.passengerId?._id.toString());
      const driver = await this.userRepository.findById(driverId.toString());
      const vehicle = await this.vehicleRepository.findOne(
        {
          driverId: driverId.toString(),
          isPrimary: true,
        },
        ['vehicleTypeId'],
      );
      const vehicleEvp = await this.driverEvpRepository.findOne({
        vehicleId: vehicle._id,
        isActive: true,
      });
      const rating = await this.ratingRepository.getAverageRating(driverId.toString());

      // Update ride status
      const updatedRide = await this.rideRepository.findByIdAndUpdate(rideId, {
        status: RideStatus.RIDE_STARTED,
        startedAt: new Date(),
      });
      if (ride.status) {
        this.validateStatusChange(ride.status as RideStatus, RideStatus.RIDE_STARTED as RideStatus);
      }
      // console.log(updatedRide, '=====updatedRide====', ride);
      // Get passenger and driver details for notifications
      // Send notification to passenger
      if (passenger?.fcmToken) {
        await this.firebaseNotificationService.sendRideStatusUpdate(
          passenger.fcmToken,
          RideStatus.RIDE_STARTED,
          rideId,
          { ...driver, vehicle, rating, vehicleEvp },
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

  async markRideReachedDestination(
    rideId: string,
    driverId: Types.ObjectId,
    data: { tollAmount?: number },
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

      if (ride.status) {
        this.validateStatusChange(ride.status as RideStatus, RideStatus.RIDE_REACHED_DESTINATION as RideStatus);
      }

      const passenger = await this.userRepository.findById(ride.passengerId?._id.toString());
      const driver = await this.userRepository.findById(driverId.toString());
      const vehicle = await this.vehicleRepository.findOne(
        {
          driverId: driverId.toString(),
          isPrimary: true,
        },
        ['vehicleTypeId'],
      );
      const vehicleEvp = await this.driverEvpRepository.findOne({
        vehicleId: vehicle._id,
        isActive: true,
      });
      const rating = await this.ratingRepository.getAverageRating(driverId.toString());

      const updateData: any = {
        status: RideStatus.RIDE_REACHED_DESTINATION,
      };

      if (typeof data.tollAmount === 'number') {
        updateData.tollAmount = data.tollAmount;
      }

      const updatedRide = await this.rideRepository.findByIdAndUpdate(rideId, updateData);

      if (passenger?.fcmToken) {
        await this.firebaseNotificationService.sendRideStatusUpdate(
          passenger.fcmToken,
          RideStatus.RIDE_REACHED_DESTINATION,
          rideId,
          { ...driver, vehicle, rating, vehicleEvp },
          updatedRide,
        );
      }

      this.logger.log(
        `Ride ${rideId} marked as reached destination by driver ${driverId}. Toll: RM${data.tollAmount ?? 0}`,
      );
      return this.mapToResponseDto(updatedRide);
    } catch (error) {
      this.logger.error(`Failed to mark ride ${rideId} as reached destination by driver ${driverId}`, error.stack);
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
      console.log(ride, '=====ride====');
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

      // For wallet payments, verify that payment has been confirmed by passenger
      if (ride.paymentMethod === PaymentMethod.WALLET) {
        // Check if driver has been paid through wallet transaction
        const driverTransaction = await this.transactionModel.findOne({
          'metadata.rideId': rideId,
          category: TransactionCategory.RIDE,
          type: TransactionType.CREDIT,
          user: driverId,
          status: TransactionStatus.COMPLETED,
        });

        if (!driverTransaction) {
          throw new BadRequestException(
            'Cannot complete ride. Payment has not been confirmed by passenger yet. Please wait for payment confirmation.',
          );
        }

        this.logger.log(`Wallet payment verified for ride ${rideId}. Driver transaction status: COMPLETED`);
      }

      // Determine payment status based on payment method
      const paymentStatus = PaymentStatus.COMPLETED;

      // Update ride with completion data
      const updateData = {
        status: RideStatus.RIDE_COMPLETED,
        completedAt: new Date(),
        finalFare,
        actualDistance: completeData.actualDistance || ride.estimatedDistance,
        actualDuration,
        notes: completeData.notes,
        paymentStatus,
      };
      const passenger = await this.userRepository.findById(ride.passengerId?._id.toString());
      const driver = await this.userRepository.findById(driverId.toString());
      const vehicle = await this.vehicleRepository.findOne({ driverId: driverId.toString(), isPrimary: true }, [
        'vehicleTypeId',
      ]);
      const vehicleEvp = await this.driverEvpRepository.findOne({
        vehicleId: vehicle._id,
        isActive: true,
      });
      const rating = await this.ratingRepository.getAverageRating(driverId.toString());

      const updatedRide = await this.rideRepository.findByIdAndUpdate(rideId, updateData);

      // Update wallet transaction and wallets based on payment method
      await this.updateRideTransaction(rideId, finalFare, ride.paymentMethod, paymentStatus, driver?._id);

      // Update driver availability - make them available again
      await this.driverLocationRepository.updateDriverStatus(driverId, DriverOnlineStatus.ONLINE, true);

      // Get passenger and driver details for notifications
      // Send completion notification to passenger
      if (passenger?.fcmToken) {
        await this.firebaseNotificationService.sendRideStatusUpdate(
          passenger.fcmToken,
          RideStatus.RIDE_COMPLETED,
          rideId,
          { ...driver, vehicle, rating, vehicleEvp },
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
      // console.log(ride, '=====ride====', driverId);
      // Validate driver is assigned to this ride
      // if (!ride.selectedDriverId || !ride.selectedDriverId._id.equals(driverId)) {
      //   throw new BadRequestException('You are not assigned to this ride');
      // }

      // Check if ride can be cancelled
      if ([RideStatus.RIDE_COMPLETED, RideStatus.RIDE_CANCELLED].includes(ride.status as RideStatus)) {
        throw new BadRequestException('Cannot cancel a completed or already cancelled ride');
      }

      const updateData = {
        status: RideStatus.REJECTED_BY_DRIVER,
        cancelledAt: new Date(),
        cancelledBy: driverId,
        cancellationReason: reason || 'Cancelled by driver',
      };
      const passenger = await this.userRepository.findById(ride.passengerId?._id.toString());
      const driver = await this.userRepository.findById(driverId.toString());
      const vehicle = await this.vehicleRepository.findOne({ driverId: driverId.toString(), isPrimary: true }, [
        'vehicleTypeId',
      ]);
      const vehicleEvp = await this.driverEvpRepository.findOne({
        vehicleId: vehicle._id,
        isActive: true,
      });
      const rating = await this.ratingRepository.getAverageRating(driverId.toString());

      const updatedRide = await this.rideRepository.findByIdAndUpdate(rideId, updateData);

      // Track driver cancellation for this passenger (exclude driver for 30 minutes)
      // Only track if driver had accepted the ride (status was DRIVER_ACCEPTED or later)
      if (
        ride.status === RideStatus.DRIVER_ACCEPTED ||
        ride.status === RideStatus.DRIVER_AT_PICKUPLOCATION ||
        ride.status === RideStatus.DRIVER_HAS_PICKUP_PASSENGER ||
        ride.status === RideStatus.RIDE_STARTED
      ) {
        const passengerId = ride.passengerId._id.toString();
        const exclusionPeriodSeconds = 3 * 60; // 3 minutes
        await this.redisService.trackDriverCancellation(driverId.toString(), passengerId, exclusionPeriodSeconds);
        this.logger.log(
          `Driver ${driverId} cancelled ride ${rideId} for passenger ${passengerId}. Excluded for ${exclusionPeriodSeconds} seconds.`,
        );
      }

      // Update driver availability - make them available again
      await this.driverLocationRepository.updateDriverStatus(driverId, DriverOnlineStatus.ONLINE, true);

      // Get passenger and driver details for notifications
      // Send cancellation notification to passenger
      if (passenger?.fcmToken) {
        await this.firebaseNotificationService.sendRideStatusUpdate(
          passenger.fcmToken,
          RideStatus.REJECTED_BY_DRIVER,
          rideId,
          { ...driver, vehicle, rating, vehicleEvp },
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
      const passenger = await this.userRepository.findById(ride.passengerId?._id.toString());
      const driver = await this.userRepository.findById(driverId.toString());
      const vehicle = await this.vehicleRepository.findOne({ driverId: driverId.toString(), isPrimary: true });
      const rating = await this.ratingRepository.getAverageRating(driverId.toString());

      const updatedRide = await this.rideRepository.findByIdAndUpdate(rideId, {
        driverId,
        status: RideStatus.DRIVER_AT_PICKUPLOCATION,
        driverAssignedAt: new Date(),
      });
      // For now, we can just send a notification without changing ride status
      // In the future, you might want to add an "ARRIVED" status
      // Send arrival notification to passenger
      if (passenger?.fcmToken) {
        await this.firebaseNotificationService.sendRideStatusUpdate(
          passenger.fcmToken,
          RideStatus.DRIVER_AT_PICKUPLOCATION,
          rideId,
          { ...driver, vehicle, rating },
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
      // console.log(ride, '=====ride====');
      if (ride.status) {
        this.validateStatusChange(ride.status as RideStatus, RideStatus.DRIVER_HAS_PICKUP_PASSENGER as RideStatus);
      }

      // In the future, you might want to add an "ARRIVED" status
      const passenger = await this.userRepository.findById(ride.passengerId?._id.toString());
      const driver = await this.userRepository.findById(driverId.toString());
      const vehicle = await this.vehicleRepository.findOne(
        {
          // _id: ride.vehicleId,
          driverId: driverId.toString(),
          isPrimary: true,
        },
        ['vehicleTypeId'],
      );
      const vehicleEvp = await this.driverEvpRepository.findOne({
        vehicleId: vehicle._id,
        isActive: true,
      });
      const rating = await this.ratingRepository.getAverageRating(driverId.toString());

      const updatedRide = await this.rideRepository.findByIdAndUpdate(rideId, {
        driverId,
        status: RideStatus.DRIVER_HAS_PICKUP_PASSENGER,
        driverAssignedAt: new Date(),
      });
      // For now, we can just send a notification without changing ride status

      // Send arrival notification to passenger
      if (passenger?.fcmToken) {
        await this.firebaseNotificationService.sendRideStatusUpdate(
          passenger.fcmToken,
          RideStatus.DRIVER_HAS_PICKUP_PASSENGER,
          rideId,
          { ...driver, vehicle, rating, vehicleEvp },
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
      [RideStatus.DRIVER_ACCEPTED]: [RideStatus.RIDE_STARTED, RideStatus.DRIVER_AT_PICKUPLOCATION],
      [RideStatus.RIDE_STARTED]: [
        RideStatus.RIDE_COMPLETED,
        RideStatus.RIDE_REACHED_DESTINATION,
        RideStatus.RIDE_CANCELLED,
      ],
      [RideStatus.RIDE_REACHED_DESTINATION]: [RideStatus.RIDE_COMPLETED, RideStatus.RIDE_CANCELLED],
      [RideStatus.DRIVER_AT_PICKUPLOCATION]: [
        RideStatus.RIDE_COMPLETED,
        RideStatus.DRIVER_HAS_PICKUP_PASSENGER,
        RideStatus.RIDE_TIMEOUT,
      ],
      [RideStatus.DRIVER_HAS_PICKUP_PASSENGER]: [
        RideStatus.RIDE_STARTED,
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

  private mapToResponseDto(ride: any): RideResponseDto {
    return {
      _id: ride._id,
      passengerId: ride.passengerId,
      paymentMethod: ride.paymentMethod,
      paymentStatus: ride.paymentStatus,
      driverId: ride.driverId,
      pickupLocation: ride.pickupLocation,
      dropoffLocation: ride.dropoffLocation,
      rideType: ride.rideType,
      status: ride.status,
      estimatedFare: ride.estimatedFare,
      tollAmount: ride.tollAmount,
      tips: ride.tips,
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

  /**
   * Create wallet transaction when ride is accepted
   */
  private async createRideTransaction(
    rideId: string,
    passengerId: string,
    driverId: string,
    amount: number,
    paymentMethod: string,
    passenger?: User,
  ): Promise<void> {
    try {
      // Get or create driver wallet
      let driverWallet = await this.walletRepository.findOne({ user: new Types.ObjectId(driverId) });
      if (!driverWallet) {
        // Create wallet using model directly
        const WalletModel = this.walletRepository['model'];
        driverWallet = await WalletModel.create({
          _id: new Types.ObjectId(),
          user: new Types.ObjectId(driverId),
          depositBalance: 0,
          withdrawableBalance: 0,
          totalBalance: 0,
          totalDeposited: 0,
          lastTransactionDate: new Date(),
        });
      }

      // Generate transaction reference
      const transactionRef = this.generateTransactionRef(TransactionType.CREDIT, TransactionCategory.RIDE);
      const transactionRefPassenger = this.generateTransactionRef(TransactionType.DEBIT, TransactionCategory.RIDE);

      if (paymentMethod === PaymentMethod.CASH) {
        const transaction = new this.transactionModel({
          _id: new Types.ObjectId(),
          transactionRef,
          user: new Types.ObjectId(driverId),
          type: TransactionType.CREDIT,
          status: TransactionStatus.PENDING,
          category: TransactionCategory.RIDE,
          balanceType: paymentMethod === PaymentMethod.CASH ? BalanceType.DEPOSIT : BalanceType.WITHDRAWABLE,
          amount,
          depositBalanceBefore: driverWallet.depositBalance,
          depositBalanceAfter: driverWallet.depositBalance,
          withdrawableBalanceBefore: driverWallet.withdrawableBalance,
          withdrawableBalanceAfter: driverWallet.withdrawableBalance,

          totalBalanceBefore: driverWallet.totalBalance,
          totalBalanceAfter: driverWallet.totalBalance,
          description: `Ride payment - ${paymentMethod === PaymentMethod.CASH ? 'Cash' : 'Card'}`,
          paymentMethod,
          metadata: {
            rideId,
            passengerId,
            paymentMethod,
          },
        });

        await transaction.save();
      } else if (paymentMethod === PaymentMethod.WALLET) {
        const passengerWallet = await this.walletRepository.findOne({
          user: new Types.ObjectId(passenger?._id.toString()),
        });
        if (!passengerWallet) {
          throw new NotFoundException('Passenger wallet not found');
        }
        const dtransaction = new this.transactionModel({
          _id: new Types.ObjectId(),
          transactionRef: transactionRef,
          user: new Types.ObjectId(driverId),
          wallet: new Types.ObjectId(driverWallet._id.toString()),
          type: TransactionType.CREDIT,
          status: TransactionStatus.PENDING,
          category: TransactionCategory.RIDE,
          balanceType: BalanceType.WITHDRAWABLE,
          amount,
          depositBalanceBefore: driverWallet.depositBalance,
          depositBalanceAfter: driverWallet.depositBalance,
          withdrawableBalanceBefore: driverWallet.withdrawableBalance,
          withdrawableBalanceAfter: driverWallet.withdrawableBalance,

          totalBalanceBefore: driverWallet.totalBalance,
          totalBalanceAfter: driverWallet.totalBalance,
          description: `Ride payment Driver Credit- Wallet`,
          paymentMethod,
          metadata: {
            rideId,
            passengerId,
            paymentMethod,
          },
        });
        const passengertransaction = new this.transactionModel({
          _id: new Types.ObjectId(),
          transactionRef: transactionRefPassenger,
          user: new Types.ObjectId(passenger?._id.toString()),

          wallet: new Types.ObjectId(passengerWallet._id.toString()),
          type: TransactionType.DEBIT,
          status: TransactionStatus.PENDING,
          category: TransactionCategory.RIDE,
          balanceType: BalanceType.WITHDRAWABLE,
          amount,
          depositBalanceBefore: passengerWallet.depositBalance,
          depositBalanceAfter: passengerWallet.depositBalance,
          withdrawableBalanceBefore: passengerWallet.withdrawableBalance,
          withdrawableBalanceAfter: passengerWallet.withdrawableBalance,
          totalBalanceBefore: passengerWallet.totalBalance,
          totalBalanceAfter: passengerWallet.totalBalance,
          description: `Ride payment Passenger Debit- Wallet`,
          paymentMethod,
          metadata: {
            rideId,
            driverId,
            paymentMethod,
          },
        });

        await passengertransaction.save();
        await dtransaction.save();
      } else if (paymentMethod === PaymentMethod.CARD) {
        const dtransaction = new this.transactionModel({
          _id: new Types.ObjectId(),
          transactionRef,
          user: new Types.ObjectId(driverId),
          wallet: driverWallet._id,
          type: TransactionType.CREDIT,
          status: TransactionStatus.PENDING,
          category: TransactionCategory.RIDE,
          balanceType: BalanceType.WITHDRAWABLE,
          amount,
          depositBalanceBefore: driverWallet.depositBalance,
          depositBalanceAfter: driverWallet.depositBalance,
          withdrawableBalanceBefore: driverWallet.withdrawableBalance,
          withdrawableBalanceAfter: driverWallet.withdrawableBalance,

          totalBalanceBefore: driverWallet.totalBalance,
          totalBalanceAfter: driverWallet.totalBalance,
          description: `Ride payment - Wallet`,
          paymentMethod,
          metadata: {
            rideId,
            passengerId,
            paymentMethod,
          },
        });

        await dtransaction.save();
      }
      // Create transaction with PENDING status

      this.logger.log(`Created ride transaction ${transactionRef} for ride ${rideId} with amount ${amount}`);
    } catch (error) {
      this.logger.error(`Failed to create ride transaction for ride ${rideId}:`, error.stack);
      // Don't throw error - transaction creation failure shouldn't block ride acceptance
    }
  }

  /**
   * Update wallet transaction and wallets when ride is completed
   */
  private async updateRideTransaction(
    rideId: string,
    finalFare: number,
    paymentMethod: string,
    paymentStatus: PaymentStatus,
    driverId: string | Types.ObjectId,
  ): Promise<void> {
    try {
      // Find the transaction for this ride
      const transaction = await this.transactionModel.findOne({
        'metadata.rideId': rideId,
        category: TransactionCategory.RIDE,
      });

      if (!transaction) {
        this.logger.warn(`No transaction found for ride ${rideId}`);
        return;
      }

      // Update transaction amount if final fare differs
      if (transaction.amount !== finalFare) {
        transaction.amount = finalFare;
      }

      // Get current wallet state for transaction record
      const driverWallet = await this.walletRepository.findOne({ user: new Types.ObjectId(driverId) });
      if (!driverWallet) {
        throw new NotFoundException('Driver wallet not found');
      }

      if (paymentMethod === PaymentMethod.CASH) {
        transaction.status = TransactionStatus.COMPLETED;
        transaction.withdrawableBalanceBefore = driverWallet.withdrawableBalance;
        transaction.withdrawableBalanceAfter = driverWallet.withdrawableBalance;

        transaction.totalBalanceBefore = driverWallet.totalBalance;
        transaction.totalBalanceAfter = driverWallet.totalBalance;

        transaction.completedAt = new Date();
        transaction.description = `Ride payment completed - Cash (RM${finalFare}) - Cash collected directly`;

        await transaction.save();
        this.logger.log(
          `Ride ${rideId} completed with cash payment of RM${finalFare}. Wallet balance unchanged (cash collected directly).`,
        );
      } else {
        transaction.withdrawableBalanceBefore = driverWallet.withdrawableBalance;
        transaction.withdrawableBalanceAfter = driverWallet.withdrawableBalance + transaction.amount;
        transaction.totalBalanceBefore = driverWallet.totalBalance;
        transaction.totalBalanceAfter = driverWallet.totalBalance + transaction.amount;
        transaction.completedAt = new Date();
        transaction.description = `Ride payment completed - ${paymentMethod} (RM${finalFare})`;

        await transaction.save();
        this.logger.log(`Ride ${rideId} completed with ${paymentMethod} payment of RM${finalFare}.`);
      }
      // If payment is cash, mark transaction as completed but don't update wallet
      // (Driver collected cash directly, so wallet balance doesn't change)
    } catch (error) {
      this.logger.error(`Failed to update ride transaction for ride ${rideId}:`, error.stack);
      // Don't throw error - transaction update failure shouldn't block ride completion
    }
  }

  /**
   * Generate transaction reference
   */
  private generateTransactionRef(type: TransactionType, category: TransactionCategory): string {
    const prefix = type === TransactionType.CREDIT ? 'CR' : 'DB';
    const categoryCode = category.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = generateRandomString(4).toUpperCase();

    return `${prefix}${categoryCode}${timestamp}${random}`;
  }

  async rejectRide(
    rideId: string,
    driverId: Types.ObjectId,
    reason?: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const ride = await this.rideRepository.findById(rideId);

      if (!ride) {
        throw new NotFoundException('Ride not found');
      }

      // Check if this driver is the current notified driver
      const currentDriver = await this.redisService.getCurrentNotifiedDriver(rideId);
      if (currentDriver !== driverId.toString()) {
        throw new BadRequestException('You are not the current driver for this ride request');
      }

      // Check if ride is still pending
      if (ride.status !== RideStatus.PENDING_DRIVER_ACCEPTANCE) {
        throw new BadRequestException('Ride is no longer available for rejection');
      }

      // Update ride with rejection info (optional, for tracking)
      await this.rideRepository.findByIdAndUpdate(rideId, {
        rejectedBy: driverId,
        rejectedAt: new Date(),
      });

      // Remove current driver from Redis
      await this.redisService.setCurrentNotifiedDriver(rideId, '', 0); // Clear immediately

      // Get passenger for notification
      const passenger = await this.userRepository.findById(ride.passengerId._id.toString());

      // Notify passenger that driver declined
      if (passenger?.fcmToken) {
        await this.firebaseNotificationService.sendRideStatusUpdate(
          passenger.fcmToken,
          RideStatus.REJECTED_BY_DRIVER,
          rideId,
          null,
          ride,
        );
      }

      // Trigger next driver notification - use a small delay to ensure rejection is processed
      setTimeout(async () => {
        try {
          const rideData = await this.rideRepository.findById(rideId);
          if (rideData && rideData.status === RideStatus.PENDING_DRIVER_ACCEPTANCE) {
            // Get passenger data for notification
            const passengerData = await this.userRepository.findById(rideData.passengerId._id.toString());
            // Trigger next driver notification
            await this.ridesService.notifyNextDriver(rideData, passengerData);
            this.logger.log(`Driver ${driverId} rejected ride ${rideId}, next driver notification triggered`);
          }
        } catch (error) {
          this.logger.error(`Failed to trigger next driver after rejection: ${error.message}`);
        }
      }, 1000);

      this.logger.log(`Driver ${driverId} rejected ride ${rideId}, moving to next driver`);

      return {
        success: true,
        message: 'Ride request rejected. System will find another driver.',
      };
    } catch (error) {
      this.logger.error(`Failed to reject ride ${rideId} by driver ${driverId}`, error.stack);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to reject ride');
    }
  }
}
