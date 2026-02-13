import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import {
  AbstractRepository,
  DriverLocation,
  DriverLocationDocument,
  DriverOnlineStatus,
  User,
  VEHICLE_CAPACITY,
  VehicleType,
} from '@urcab-workspace/shared';

@Injectable()
export class DriverLocationRepository extends AbstractRepository<DriverLocationDocument> {
  protected readonly logger = new Logger(DriverLocationRepository.name);

  constructor(
    @InjectModel(DriverLocation.name)
    driverLocationModel: Model<DriverLocationDocument>,
    private readonly configService: ConfigService,
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
    passengerCount: number = 4,
    vehicleTypeId: Types.ObjectId | string,
  ): Promise<DriverLocationDocument[]> {
    try {
      this.logger.debug(`Searching for drivers near [${longitude}, ${latitude}] within ${radiusInKm}km`);
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const now = new Date();

      const res = await this.model
        .aggregate([
          // Use $geoNear as the first stage instead of $near in $match
          {
            $geoNear: {
              near: {
                type: 'Point',
                coordinates: [parseFloat(longitude.toString()), parseFloat(latitude.toString())],
              },
              distanceField: 'distanceInMeters',
              maxDistance: radiusInKm * 1000, // Convert km to meters
              spherical: true,
              key: 'location',
              query: {
                status: DriverOnlineStatus.ONLINE,
                isAvailableForRides: true,
                // currentRideId: { $exists: false },
                lastLocationUpdate: {
                  $gte: tenMinutesAgo,
                },
              },
            },
          },
          {
            $addFields: {
              distanceInKm: {
                $divide: ['$distanceInMeters', 1000],
              },
            },
          },

          {
            $addFields: {
              debugInfo: {
                foundDriver: true,
                distanceKm: { $divide: ['$distanceInMeters', 10000] },
                lastUpdate: '$lastLocationUpdate',
                status: '$status',
                available: '$isAvailableForRides',
              },
            },
          },
          {
            $lookup: {
              from: 'user',
              let: { driverId: '$driverId' },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ['$_id', '$$driverId'] },
                    type: 2, // Driver role
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
                    rating: 1,
                    totalRides: 1,
                  },
                },
              ],
              as: 'driver',
            },
          },
          {
            $lookup: {
              from: 'vehicle',
              let: { driverId: '$driverId' },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ['$driverId', '$$driverId'] },
                    isPrimary: true,
                    isActive: true,
                    vehicleTypeId: new Types.ObjectId(vehicleTypeId),
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
                    vehicleTypeId: 1,
                    photos: 1,
                    status: 1,
                  },
                },
              ],
              as: 'vehicle',
            },
          },
          {
            $lookup: {
              from: 'vehicleType',
              let: { vehicleTypeIds: '$vehicle.vehicleTypeId' },
              pipeline: [
                {
                  $match: {
                    $expr: { $in: ['$_id', '$$vehicleTypeIds'] },
                    isActive: true,
                  },
                },
                {
                  $project: {
                    name: 1,
                    capacity: 1,
                  },
                },
              ],
              as: 'vehicleTypeInfo',
            },
          },
          {
            $lookup: {
              from: 'vehicleEvp',
              let: { vehicleIds: '$vehicle._id' },
              pipeline: [
                {
                  $match: {
                    $expr: { $in: ['$vehicleId', '$$vehicleIds'] },
                    isActive: true,
                    endDate: { $gt: now }, // Not expired
                    revokedAt: { $exists: false }, // Not revoked
                  },
                },
                {
                  $limit: 1, // Only need one active EVP
                },
                {
                  $project: {
                    _id: 1,
                    certificateNumber: 1,
                    startDate: 1,
                    endDate: 1,
                    isActive: 1,
                  },
                },
              ],
              as: 'vehicleEvp',
            },
          },
          {
            $lookup: {
              from: 'subscriptions',
              let: { driverId: '$driverId' },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ['$driverId', '$$driverId'] },
                    status: 'active',
                    type: { $in: ['daily', 'weekly', 'monthly'] }, // Paid subscriptions only
                    startDate: { $lte: now },
                    endDate: { $gte: now },
                  },
                },
                {
                  $sort: {
                    type: 1,
                  },
                },
                {
                  $limit: 1,
                },
                {
                  $project: {
                    type: 1,
                    status: 1,
                    dailyRideRequests: 1,
                    lastRideRequestDate: 1,
                    endDate: 1,
                  },
                },
              ],
              as: 'subscriptions',
            },
          },
          {
            $addFields: {
              debugLookup: {
                hasDriver: { $gt: [{ $size: '$driver' }, 0] },
                hasVehicle: { $gt: [{ $size: '$vehicle' }, 0] },
                driverCount: { $size: '$driver' },
                vehicleCount: { $size: '$vehicle' },
                requestedVehicleType: new Types.ObjectId(vehicleTypeId),
                hasSubscription: { $gt: [{ $size: '$subscriptions' }, 0] },
                hasActiveEvp: { $gt: [{ $size: '$vehicleEvp' }, 0] },
              },
              // Get the active subscription (first one from sorted lookup)
              activeSubscription: {
                $arrayElemAt: ['$subscriptions', 0],
              },
              // Get the active EVP (first one from lookup)
              activeVehicleEvp: {
                $arrayElemAt: ['$vehicleEvp', 0],
              },
            },
          },
          {
            $addFields: {
              // Driver can accept rides if they have at least one active subscription
              canAcceptRides: {
                $gt: [{ $size: '$subscriptions' }, 0],
              },
            },
          },
          {
            $match: {
              'driver.0': { $exists: true }, // Ensure driver exists and is verified
              'vehicle.0': { $exists: true }, // Ensure vehicle exists and is verified
              'vehicleTypeInfo.0': { $exists: true }, // Ensure vehicle type info exists
              'vehicleEvp.0': { $exists: true }, // Ensure vehicle has an active EVP
              canAcceptRides: true, // Only include drivers who can accept rides based on subscription
            },
          },
          {
            $unwind: { path: '$driver', preserveNullAndEmptyArrays: false },
          },
          {
            $unwind: { path: '$vehicle', preserveNullAndEmptyArrays: false },
          },
          {
            $unwind: { path: '$vehicleTypeInfo', preserveNullAndEmptyArrays: false },
          },

          {
            $addFields: {
              // Use pricePerKM from vehicleType schema as fare multiplier
              // fareMultiplier: {
              //   $cond: {
              //     if: {
              //       $and: [{ $isNumber: '$vehicleTypeInfo.pricePerKM' }, { $gt: ['$vehicleTypeInfo.pricePerKM', 0] }],
              //     },
              //     then: { $divide: ['$vehicleTypeInfo.pricePerKM', 1.0] }, // Normalize against base price of 1.0
              //     else: 1.0, // Default value if pricePerKM is not set or valid
              //   },
              // },
              // Add vehicle type info for easy access
              vehicleTypeDetails: {
                name: '$vehicleTypeInfo.name',
                pricePerKM: '$vehicleTypeInfo.pricePerKM',
                capacity: '$vehicleTypeInfo.capacity',
                description: '$vehicleTypeInfo.description',
                iconUrl: '$vehicleTypeInfo.iconUrl',
              },
            },
          },
          {
            $project: {
              _id: 1,
              driverId: 1,
              location: 1,
              status: 1,
              isAvailableForRides: 1,
              lastLocationUpdate: 1,
              heading: 1,
              speed: 1,
              accuracy: 1,
              address: 1,
              distanceInMeters: 1,
              distanceInKm: 1,
              driver: 1,
              vehicle: 1,
              vehicleTypeDetails: 1,
              // fareMultiplier: 1,
              canAccommodatePassengers: {
                $gte: [{ $ifNull: ['$vehicleTypeInfo.capacity', '$vehicle.seatingCapacity'] }, passengerCount],
              },
              estimatedArrivalTime: {
                $add: [
                  new Date(),
                  {
                    $multiply: [
                      '$distanceInKm',
                      2,
                      60000, // Convert minutes to milliseconds (assuming 1 km/min average speed)
                    ],
                  },
                ],
              },
            },
          },
          {
            $sort: {
              distanceInMeters: 1, // Sort by distance (closest first)
              // 'driver.rating': -1, // Then by driver rating (highest first)
            },
          },
          {
            $limit: limit,
          },
        ])
        .exec();

      this.logger.debug(`Found ${res.length} nearby drivers`);
      return res;
    } catch (error) {
      this.logger.error(`Failed to find nearby drivers with vehicles near ${longitude}, ${latitude}`, error.stack);
      throw error;
    }
  }

  async findNearbyDriversWithVehiclesUsingGeoWithin(
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
              lastLocationUpdate: {
                $gte: new Date(Date.now() - 5 * 60 * 1000),
              },
              location: {
                $geoWithin: {
                  $centerSphere: [
                    [longitude, latitude],
                    radiusInKm / 6378.1, // Convert km to radians (Earth radius ≈ 6378.1 km)
                  ],
                },
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
                    type: 2,
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
                    rating: 1,
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
              'driver.0': { $exists: true },
              'vehicle.0': { $exists: true },
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
      this.logger.error(
        `Failed to find nearby drivers with vehicles using geoWithin near ${longitude}, ${latitude}`,
        error.stack,
      );
      throw error;
    }
  }

  async debugNearbyDriverSearch(longitude: number, latitude: number, radiusInKm: number = 10): Promise<any> {
    try {
      // Step 1: Check if any drivers exist
      const allDrivers = await this.model.find({}).limit(5).exec();
      this.logger.log(`Total drivers in collection: ${allDrivers.length}`);

      // Step 2: Check drivers without filters
      const driversWithoutFilters = await this.model
        .aggregate([
          {
            $geoNear: {
              near: {
                type: 'Point',
                coordinates: [parseFloat(longitude.toString()), parseFloat(latitude.toString())],
              },
              distanceField: 'distanceInMeters',
              maxDistance: radiusInKm * 1000,
              spherical: true,
              key: 'location',
              query: {}, // No filters
            },
          },
          {
            $addFields: {
              distanceInKm: { $divide: ['$distanceInMeters', 1000] },
            },
          },
          { $limit: 10 },
        ])
        .exec();

      this.logger.log(`Drivers within ${radiusInKm}km (no filters): ${driversWithoutFilters.length}`);

      // Step 3: Check with status filter only
      const driversWithStatusFilter = await this.model
        .aggregate([
          {
            $geoNear: {
              near: {
                type: 'Point',
                coordinates: [parseFloat(longitude.toString()), parseFloat(latitude.toString())],
              },
              distanceField: 'distanceInMeters',
              maxDistance: radiusInKm * 1000,
              spherical: true,
              key: 'location',
              query: {
                status: DriverOnlineStatus.ONLINE,
                isAvailableForRides: true,
              },
            },
          },
          {
            $addFields: {
              distanceInKm: { $divide: ['$distanceInMeters', 1000] },
            },
          },
          { $limit: 10 },
        ])
        .exec();

      this.logger.log(`Drivers with status filter: ${driversWithStatusFilter.length}`);

      // Step 4: Check collection names
      const collections = await this.model.db.db.listCollections().toArray();
      const collectionNames = collections.map((c) => c.name);
      this.logger.log(`Available collections: ${collectionNames.join(', ')}`);

      return {
        searchLocation: [longitude, latitude],
        radiusKm: radiusInKm,
        totalDrivers: allDrivers.length,
        driversWithinRadius: driversWithoutFilters.length,
        driversWithStatusFilter: driversWithStatusFilter.length,
        availableCollections: collectionNames,
        sampleDrivers: driversWithoutFilters.slice(0, 3),
      };
    } catch (error) {
      this.logger.error('Debug search failed', error.stack);
      throw error;
    }
  }

  async updateDriverStatus(
    driverId: Types.ObjectId,
    status: DriverOnlineStatus,
    currentRideId?: Types.ObjectId,
  ): Promise<DriverLocationDocument | null> {
    try {
      const updateData: any = {
        status,
        lastStatusChange: new Date(),
        isAvailableForRides: status === DriverOnlineStatus.ONLINE && !currentRideId,
      };

      if (currentRideId) {
        updateData.currentRideId = currentRideId;
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
