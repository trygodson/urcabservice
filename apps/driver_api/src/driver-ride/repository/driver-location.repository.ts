import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AbstractRepository,
  DriverLocation,
  DriverLocationDocument,
  DriverOnlineStatus,
} from '@urcab-workspace/shared';

@Injectable()
export class DriverLocationRepository extends AbstractRepository<DriverLocationDocument> {
  protected readonly logger = new Logger(DriverLocationRepository.name);

  constructor(
    @InjectModel(DriverLocation.name)
    driverLocationModel: Model<DriverLocationDocument>,
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
      const updateData = {
        driverId,
        location: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        status,
        lastLocationUpdate: new Date(),
        isAvailableForRides: status === DriverOnlineStatus.ONLINE,
        ...(options?.heading !== undefined && { heading: options.heading }),
        ...(options?.speed !== undefined && { speed: options.speed }),
        ...(options?.accuracy !== undefined && { accuracy: options.accuracy }),
        ...(options?.address && { address: options.address }),
      };

      return await this.model
        .findOneAndUpdate({ driverId }, updateData, {
          upsert: true,
          new: true,
          runValidators: true,
        })
        .populate('driverId', 'firstName lastName phone photo email type')
        .exec();
    } catch (error) {
      this.logger.error(`Failed to update driver location for driver ${driverId}`, error.stack);
      throw error;
    }
  }

  async updateDriverStatus(
    driverId: Types.ObjectId,
    status: DriverOnlineStatus | string,
    isAvailableForRides: Boolean,
    currentRideId?: string,
  ): Promise<DriverLocationDocument | null> {
    try {
      const updateData: any = {
        status,
        lastStatusChange: new Date(),
        // isAvailableForRides: status === DriverOnlineStatus.ONLINE && !currentRideId,
        isAvailableForRides,
      };

      if (isAvailableForRides) {
        if (currentRideId) {
          updateData.currentRideId = new Types.ObjectId(currentRideId);
        }
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
