import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AbstractRepository,
  DriverLocation,
  DriverLocationDocument,
  DriverOnlineStatus,
  User,
  UserDocument,
} from '@urcab-workspace/shared';

@Injectable()
export class DriverLocationRepository extends AbstractRepository<DriverLocationDocument> {
  protected readonly logger = new Logger(DriverLocationRepository.name);

  constructor(
    @InjectModel(DriverLocation.name)
    driverLocationModel: Model<DriverLocationDocument>,
    @InjectModel(User.name) // Inject User model
    private readonly userModel: Model<UserDocument>,
  ) {
    super(driverLocationModel);
  }

  async updateDriverLocation(
    driverId: Types.ObjectId,
    longitude: number,
    latitude: number,
    status: DriverOnlineStatus = DriverOnlineStatus.ONLINE,
    options?: {
      heading?: number;
      speed?: number;
      accuracy?: number;
      address?: string;
    },
  ): Promise<DriverLocationDocument> {
    try {
      // Validate coordinates first
      if (typeof longitude !== 'number' || typeof latitude !== 'number') {
        throw new Error('Invalid coordinates: longitude and latitude must be numbers');
      }

      if (longitude < -180 || longitude > 180) {
        throw new Error('Invalid longitude: must be between -180 and 180');
      }

      if (latitude < -90 || latitude > 90) {
        throw new Error('Invalid latitude: must be between -90 and 90');
      }

      const updateData = {
        driverId,
        location: {
          type: 'Point',
          coordinates: [parseFloat(longitude.toString()), parseFloat(latitude.toString())],
        },
        status,
        lastLocationUpdate: new Date(),
        isAvailableForRides: status === DriverOnlineStatus.ONLINE,
        ...(options?.heading !== undefined && { heading: options.heading }),
        ...(options?.speed !== undefined && { speed: options.speed }),
        ...(options?.accuracy !== undefined && { accuracy: options.accuracy }),
        ...(options?.address && { address: options.address }),
      };

      // Log the coordinates for debugging
      this.logger.debug(`Updating driver location for ${driverId}: [${longitude}, ${latitude}]`);

      return await this.model
        .findOneAndUpdate({ driverId }, updateData, {
          upsert: true,
          new: true,
          runValidators: true,
          // Ensure we're using the correct write concern
          writeConcern: { w: 'majority' },
        })
        .populate('driverId', 'firstName lastName phone photo email type')
        .exec();
    } catch (error) {
      this.logger.error(`Failed to update driver location for driver ${driverId}`, error.stack);
      this.logger.error(`Coordinates attempted: longitude=${longitude}, latitude=${latitude}`);
      throw error;
    }
  }

  async findNearbyAvailableDrivers(
    longitude: number,
    latitude: number,
    radiusInKm: number = 10,
    limit: number = 20,
  ): Promise<DriverLocationDocument[]> {
    try {
      return await this.model
        .find({
          status: DriverOnlineStatus.ONLINE,
          isAvailableForRides: true,
          currentRideId: { $exists: false }, // Not currently on a ride
          location: {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [longitude, latitude],
              },
              $maxDistance: radiusInKm * 1000, // Convert km to meters
            },
          },
          // Only include drivers who updated their location in the last 5 minutes
          lastLocationUpdate: {
            $gte: new Date(Date.now() - 5 * 60 * 1000),
          },
        })
        .populate('driverId', 'firstName lastName phone photo email type')
        .limit(limit)
        .exec();
    } catch (error) {
      this.logger.error(`Failed to find nearby drivers near ${longitude}, ${latitude}`, error.stack);
      throw error;
    }
  }

  async findNearbyDriversWithVehicles(
    longitude: number,
    latitude: number,
    radiusInKm: number = 10,
    limit: number = 20,
  ): Promise<DriverLocationDocument[]> {
    try {
      return await this.model
        .aggregate([
          {
            $match: {
              status: DriverOnlineStatus.ONLINE,
              isAvailableForRides: true,
              currentRideId: { $exists: false },
              location: {
                $near: {
                  $geometry: {
                    type: 'Point',
                    coordinates: [longitude, latitude],
                  },
                  $maxDistance: radiusInKm * 1000,
                },
              },
              lastLocationUpdate: {
                $gte: new Date(Date.now() - 5 * 60 * 1000),
              },
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'driverId',
              foreignField: '_id',
              as: 'driver',
              pipeline: [
                {
                  $match: {
                    type: 2, // Driver role
                    isDriverVerified: true,
                    isActive: true,
                  },
                },
                {
                  $project: {
                    firstName: 1,
                    lastName: 1,
                    phone: 1,
                    photo: 1,
                    email: 1,
                    type: 1,
                  },
                },
              ],
            },
          },
          {
            $lookup: {
              from: 'vehicles',
              localField: 'driverId',
              foreignField: 'driverId',
              as: 'vehicle',
              pipeline: [
                {
                  $match: {
                    isPrimary: true,
                    isActive: true,
                    status: 'verified',
                  },
                },
                {
                  $project: {
                    make: 1,
                    model: 1,
                    year: 1,
                    color: 1,
                    licensePlate: 1,
                    seatingCapacity: 1,
                    vehicleType: 1,
                  },
                },
              ],
            },
          },
          {
            $match: {
              'driver.0': { $exists: true }, // Ensure driver exists and is verified
              'vehicle.0': { $exists: true }, // Ensure vehicle exists and is verified
            },
          },
          {
            $unwind: '$driver',
          },
          {
            $unwind: '$vehicle',
          },
          {
            $limit: limit,
          },
        ])
        .exec();
    } catch (error) {
      this.logger.error(`Failed to find nearby drivers with vehicles near ${longitude}, ${latitude}`, error.stack);
      throw error;
    }
  }

  async updateDriverStatus(
    driverId: Types.ObjectId,
    status: DriverOnlineStatus,
    isAvailableForRides: Boolean,
    // currentRideId?: Types.ObjectId,
  ): Promise<DriverLocationDocument | null> {
    try {
      const updateData: any = {
        status,
        lastStatusChange: new Date(),
        // isAvailableForRides: status === DriverOnlineStatus.ONLINE && !currentRideId,
        isAvailableForRides,
      };

      if (isAvailableForRides) {
        // updateData.currentRideId = currentRideId;
      } else {
        updateData.$unset = { currentRideId: '' };
      }

      return await this.model
        .findOneAndUpdate({ driverId }, updateData, { new: true, runValidators: true })
        .populate('driverId', 'firstName lastName phone photo email')
        .exec();
    } catch (error) {
      this.logger.error(`Failed to update driver status for driver ${driverId}`, error.stack);
      throw error;
    }
  }

  async getDriverLocation(driverId: Types.ObjectId): Promise<DriverLocationDocument | null> {
    try {
      return await this.model.findOne({ driverId }).populate('driverId', 'firstName lastName phone photo email').exec();
    } catch (error) {
      this.logger.error(`Failed to get driver location for driver ${driverId}`, error.stack);
      throw error;
    }
  }

  async getOnlineDriversCount(radiusInKm?: number, centerLng?: number, centerLat?: number): Promise<number> {
    try {
      const query: any = {
        status: DriverOnlineStatus.ONLINE,
        isAvailableForRides: true,
        lastLocationUpdate: {
          $gte: new Date(Date.now() - 5 * 60 * 1000),
        },
      };

      if (radiusInKm && centerLng !== undefined && centerLat !== undefined) {
        query.location = {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [centerLng, centerLat],
            },
            $maxDistance: radiusInKm * 1000,
          },
        };
      }

      return await this.model.countDocuments(query);
    } catch (error) {
      this.logger.error('Failed to get online drivers count', error.stack);
      throw error;
    }
  }

  async removeStaleDriverLocations(staleMinutes: number = 10): Promise<number> {
    try {
      const staleTime = new Date(Date.now() - staleMinutes * 60 * 1000);

      const result = await this.model.updateMany(
        {
          lastLocationUpdate: { $lt: staleTime },
          status: { $ne: DriverOnlineStatus.OFFLINE },
        },
        {
          status: DriverOnlineStatus.OFFLINE,
          isAvailableForRides: false,
          lastStatusChange: new Date(),
        },
      );

      return result.modifiedCount;
    } catch (error) {
      this.logger.error('Failed to remove stale driver locations', error.stack);
      throw error;
    }
  }

  async calculateDistanceToDriver(
    driverId: Types.ObjectId,
    passengerLng: number,
    passengerLat: number,
  ): Promise<number | null> {
    try {
      const result = await this.model.aggregate([
        {
          $match: { driverId },
        },
        {
          $addFields: {
            distance: {
              $divide: [
                {
                  $geoNear: {
                    near: {
                      type: 'Point',
                      coordinates: [passengerLng, passengerLat],
                    },
                    distanceField: 'distance',
                    spherical: true,
                  },
                },
                1000, // Convert meters to kilometers
              ],
            },
          },
        },
        {
          $project: { distance: 1 },
        },
      ]);

      return result.length > 0 ? result[0].distance : null;
    } catch (error) {
      this.logger.error(`Failed to calculate distance to driver ${driverId}`, error.stack);
      throw error;
    }
  }
}
