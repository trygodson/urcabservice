import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { DriverOnlineStatus } from '@urcab-workspace/shared';
import {
  DriverLocationResponseDto,
  NearbyDriverResponseDto,
  UpdateDriverLocationDto,
  UpdateDriverStatusDto,
} from './dto';
import { DriverLocationRepository } from './repository/driver-location.repository';

@Injectable()
export class DriverLocationService {
  private readonly logger = new Logger(DriverLocationService.name);

  constructor(private readonly driverLocationRepository: DriverLocationRepository) {}

  async updateDriverLocation(
    driverId: Types.ObjectId,
    updateLocationDto: UpdateDriverLocationDto,
  ): Promise<DriverLocationResponseDto> {
    try {
      const {
        longitude,
        latitude,
        status = null,
        heading = undefined,
        speed = undefined,
        accuracy = undefined,
        address = undefined,
      } = updateLocationDto;

      const updatedLocation = await this.driverLocationRepository.updateDriverLocation(
        driverId,
        longitude,
        latitude,
        status || DriverOnlineStatus.ONLINE,
        {
          heading,
          speed,
          accuracy,
          address,
        },
      );
      return this.mapToResponseDto(updatedLocation);
    } catch (error) {
      this.logger.error(`Failed to update driver location for driver ${driverId}`, error.stack);
      throw new BadRequestException('Failed to update driver location');
    }
  }

  async updateDriverStatus(
    driverId: Types.ObjectId,
    updateStatusDto: UpdateDriverStatusDto,
  ): Promise<DriverLocationResponseDto> {
    try {
      const { status, isAvailableForRides } = updateStatusDto;

      const updatedLocation = await this.driverLocationRepository.updateDriverStatus(
        driverId,
        status,
        isAvailableForRides,
      );

      if (!updatedLocation) {
        throw new NotFoundException('Driver location not found');
      }

      return this.mapToResponseDto(updatedLocation);
    } catch (error) {
      this.logger.error(`Failed to update driver status for driver ${driverId}`, error.stack);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException('Failed to update driver status');
    }
  }

  async getDriverLocation(driverId: Types.ObjectId): Promise<DriverLocationResponseDto> {
    try {
      const driverLocation = await this.driverLocationRepository.getDriverLocation(driverId);

      if (!driverLocation) {
        throw new NotFoundException('Driver location not found');
      }

      return this.mapToResponseDto(driverLocation);
    } catch (error) {
      this.logger.error(`Failed to get driver location for driver ${driverId}`, error.stack);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException('Failed to get driver location');
    }
  }

  async findNearbyDrivers(
    longitude: number,
    latitude: number,
    radiusInKm: number = 10,
    limit: number = 20,
  ): Promise<NearbyDriverResponseDto[]> {
    try {
      const nearbyDrivers = await this.driverLocationRepository.findNearbyDriversWithVehicles(
        longitude,
        latitude,
        radiusInKm,
        limit,
      );

      return nearbyDrivers.map((driver) => this.mapToNearbyDriverResponseDto(driver));
    } catch (error) {
      this.logger.error(`Failed to find nearby drivers near ${longitude}, ${latitude}`, error.stack);
      throw new BadRequestException('Failed to find nearby drivers');
    }
  }

  async setDriverAvailability(
    driverId: Types.ObjectId,
    isAvailable: boolean,
    currentRideId?: Types.ObjectId,
  ): Promise<DriverLocationResponseDto> {
    try {
      const status = isAvailable ? DriverOnlineStatus.ONLINE : DriverOnlineStatus.BUSY;

      const updatedLocation = await this.driverLocationRepository.updateDriverStatus(
        driverId,
        status,
        isAvailable,
        // currentRideId
      );

      if (!updatedLocation) {
        throw new NotFoundException('Driver location not found');
      }

      return this.mapToResponseDto(updatedLocation);
    } catch (error) {
      this.logger.error(`Failed to set driver availability for driver ${driverId}`, error.stack);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException('Failed to set driver availability');
    }
  }

  async goOffline(driverId: Types.ObjectId): Promise<DriverLocationResponseDto> {
    try {
      const updatedLocation = await this.driverLocationRepository.updateDriverStatus(
        driverId,
        DriverOnlineStatus.OFFLINE,
        false,
      );

      if (!updatedLocation) {
        throw new NotFoundException('Driver location not found');
      }

      return this.mapToResponseDto(updatedLocation);
    } catch (error) {
      this.logger.error(`Failed to set driver offline for driver ${driverId}`, error.stack);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException('Failed to set driver offline');
    }
  }

  async getOnlineDriversCount(radiusInKm?: number, centerLng?: number, centerLat?: number): Promise<{ count: number }> {
    try {
      const count = await this.driverLocationRepository.getOnlineDriversCount(radiusInKm, centerLng, centerLat);

      return { count };
    } catch (error) {
      this.logger.error('Failed to get online drivers count', error.stack);
      throw new BadRequestException('Failed to get online drivers count');
    }
  }

  private mapToResponseDto(driverLocation: any): DriverLocationResponseDto {
    return {
      _id: driverLocation._id.toString(),
      driverId: driverLocation.driverId._id
        ? driverLocation.driverId._id.toString()
        : driverLocation.driverId.toString(),
      location: driverLocation.location,
      status: driverLocation.status,
      heading: driverLocation.heading,
      speed: driverLocation.speed,
      accuracy: driverLocation.accuracy,
      lastLocationUpdate: driverLocation.lastLocationUpdate,
      lastStatusChange: driverLocation.lastStatusChange,
      isAvailableForRides: driverLocation.isAvailableForRides,
      currentRideId: driverLocation.currentRideId?.toString(),
      address: driverLocation.address,
      driver: driverLocation.driverId.firstName
        ? {
            firstName: driverLocation.driverId.firstName,
            lastName: driverLocation.driverId.lastName,
            phone: driverLocation.driverId.phone,
            photo: driverLocation.driverId.photo,
            email: driverLocation.driverId.email,
          }
        : undefined,
      createdAt: driverLocation.createdAt,
      updatedAt: driverLocation.updatedAt,
    };
  }

  private mapToNearbyDriverResponseDto(driver: any): NearbyDriverResponseDto {
    // Estimate arrival time based on distance and average speed (30 km/h in city)
    const estimatedArrivalTime = Math.round((driver.distance / 30) * 60); // minutes

    return {
      driverId: driver.driverId.toString(),
      location: driver.location,
      status: driver.status,
      distance: Math.round(driver.distance * 100) / 100, // Round to 2 decimal places
      lastLocationUpdate: driver.lastLocationUpdate,
      driver: {
        firstName: driver.driver.firstName,
        lastName: driver.driver.lastName,
        phone: driver.driver.phone,
        photo: driver.driver.photo,
        email: driver.driver.email,
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
