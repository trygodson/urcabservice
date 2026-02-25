import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AbstractRepository, Ride, RideDocument, RideStatus } from '@urcab-workspace/shared';
import { Model, Types } from 'mongoose';

@Injectable()
export class DriverRideRepository extends AbstractRepository<RideDocument> {
  protected readonly logger = new Logger(DriverRideRepository.name);

  constructor(
    @InjectModel(Ride.name)
    rideModel: Model<RideDocument>,
  ) {
    super(rideModel);
  }

  async findNearbyRideRequests(
    longitude: number,
    latitude: number,
    radius: number,
    excludeDriverId?: Types.ObjectId,
  ): Promise<RideDocument[]> {
    try {
      this.logger.debug(`Finding nearby ride requests at [${longitude}, ${latitude}] within ${radius}km`);

      const query: any = {
        status: RideStatus.SEARCHING_DRIVER,
        // Exclude rides that already have the current driver assigned or selected
        ...(excludeDriverId && {
          $and: [{ driverId: { $ne: excludeDriverId } }, { selectedDriverId: { $ne: excludeDriverId } }],
        }),
        // Only include rides created within the last 10 minutes
        createdAt: {
          $gte: new Date(Date.now() - 10 * 60 * 1000),
        },
      };

      const rides = await this.model
        .aggregate([
          {
            $geoNear: {
              near: {
                type: 'Point',
                coordinates: [parseFloat(longitude.toString()), parseFloat(latitude.toString())],

                // coordinates: [longitude, latitude],
              },
              distanceField: 'distanceToPickup',
              maxDistance: radius * 1000, // Convert km to meters
              spherical: true,
              key: 'pickupLocation',
              query,
            },
          },
          {
            $addFields: {
              distanceToPickupKm: {
                $divide: ['$distanceToPickup', 1000],
              },
            },
          },
          {
            $sort: {
              distanceToPickup: 1, // Closest first
              createdAt: -1, // Then newest first
            },
          },
          {
            $limit: 20, // Limit to 20 nearby requests
          },
        ])
        .exec();

      this.logger.debug(`Found ${rides.length} nearby ride requests`);
      return rides;
    } catch (error) {
      this.logger.error(`Failed to find nearby ride requests`, error.stack);
      throw error;
    }
  }

  async findDriverCurrentRide(driverId: Types.ObjectId): Promise<RideDocument | null> {
    try {
      this.logger.debug(`Finding current ride for driver ${driverId}`);

      const currentRide = await this.model
        .findOne({
          driverId,
          status: {
            $in: [
              RideStatus.DRIVER_ACCEPTED,
              RideStatus.DRIVER_AT_PICKUPLOCATION,
              RideStatus.DRIVER_HAS_PICKUP_PASSENGER,
              RideStatus.RIDE_STARTED,
              RideStatus.RIDE_REACHED_DESTINATION,
            ],
          },
        })
        .populate('passengerId', 'firstName lastName fullName phone photo email rating')
        .sort({ updatedAt: -1 })
        .exec();

      if (currentRide) {
        this.logger.debug(`Found current ride ${currentRide._id} for driver ${driverId}`);
      } else {
        this.logger.debug(`No current ride found for driver ${driverId}`);
      }

      return currentRide;
    } catch (error) {
      this.logger.error(`Failed to find current ride for driver ${driverId}`, error.stack);
      throw error;
    }
  }

  async findDriverRides(
    driverId: Types.ObjectId,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ rides: RideDocument[]; total: number }> {
    try {
      this.logger.debug(`Finding rides for driver ${driverId}, page ${page}, limit ${limit}`);

      const skip = (page - 1) * limit;

      const [rides, total] = await Promise.all([
        this.model
          .find({ driverId })
          .populate('passengerId', 'firstName lastName phone photo email rating')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.model.countDocuments({ driverId }),
      ]);

      this.logger.debug(`Found ${rides.length} rides (${total} total) for driver ${driverId}`);

      return {
        rides,
        total,
      };
    } catch (error) {
      this.logger.error(`Failed to find rides for driver ${driverId}`, error.stack);
      throw error;
    }
  }

  async getDriverStats(driverId: Types.ObjectId): Promise<{
    totalRides: number;
    completedRides: number;
    cancelledRides: number;
    totalEarnings: number;
    averageRating: number;
  }> {
    try {
      this.logger.debug(`Getting driver stats for driver ${driverId}`);

      const stats = await this.model
        .aggregate([
          {
            $match: { driverId },
          },
          {
            $group: {
              _id: null,
              totalRides: { $sum: 1 },
              completedRides: {
                $sum: {
                  $cond: [{ $eq: ['$status', RideStatus.RIDE_COMPLETED] }, 1, 0],
                },
              },
              cancelledRides: {
                $sum: {
                  $cond: [{ $eq: ['$status', RideStatus.RIDE_CANCELLED] }, 1, 0],
                },
              },
              totalEarnings: {
                $sum: {
                  $cond: [
                    { $eq: ['$status', RideStatus.RIDE_COMPLETED] },
                    { $ifNull: ['$finalFare', '$estimatedFare'] },
                    0,
                  ],
                },
              },
              // For average rating, we would need a separate ratings collection
              // For now, we'll calculate based on passenger ratings if available
              ratingSum: {
                $sum: {
                  $cond: [
                    {
                      $and: [{ $eq: ['$status', RideStatus.RIDE_COMPLETED] }, { $ne: ['$driverRating', null] }],
                    },
                    '$driverRating',
                    0,
                  ],
                },
              },
              ratedRides: {
                $sum: {
                  $cond: [
                    {
                      $and: [{ $eq: ['$status', RideStatus.RIDE_COMPLETED] }, { $ne: ['$driverRating', null] }],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
          {
            $addFields: {
              averageRating: {
                $cond: [{ $gt: ['$ratedRides', 0] }, { $divide: ['$ratingSum', '$ratedRides'] }, 0],
              },
            },
          },
        ])
        .exec();

      const result =
        stats.length > 0
          ? stats[0]
          : {
              totalRides: 0,
              completedRides: 0,
              cancelledRides: 0,
              totalEarnings: 0,
              averageRating: 0,
            };

      // Remove the aggregation helper fields
      delete result._id;
      delete result.ratingSum;
      delete result.ratedRides;

      this.logger.debug(`Driver ${driverId} stats: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to get driver stats for driver ${driverId}`, error.stack);
      throw error;
    }
  }

  async findPassengerRides(
    passengerId: Types.ObjectId,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ rides: RideDocument[]; total: number }> {
    try {
      this.logger.debug(`Finding rides for passenger ${passengerId}, page ${page}, limit ${limit}`);

      const skip = (page - 1) * limit;

      const [rides, total] = await Promise.all([
        this.model
          .find({ passengerId })
          .populate('driverId', 'firstName lastName phone photo email rating')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.model.countDocuments({ passengerId }),
      ]);

      this.logger.debug(`Found ${rides.length} rides (${total} total) for passenger ${passengerId}`);

      return {
        rides,
        total,
      };
    } catch (error) {
      this.logger.error(`Failed to find rides for passenger ${passengerId}`, error.stack);
      throw error;
    }
  }

  async findPassengerCurrentRide(passengerId: Types.ObjectId): Promise<RideDocument | null> {
    try {
      this.logger.debug(`Finding current ride for passenger ${passengerId}`);

      const currentRide = await this.model
        .findOne({
          passengerId,
          status: {
            $in: [RideStatus.SEARCHING_DRIVER, RideStatus.DRIVER_ACCEPTED, RideStatus.RIDE_STARTED],
          },
        })
        .populate('driverId', 'firstName lastName phone photo email rating')
        .sort({ updatedAt: -1 })
        .exec();

      if (currentRide) {
        this.logger.debug(`Found current ride ${currentRide._id} for passenger ${passengerId}`);
      } else {
        this.logger.debug(`No current ride found for passenger ${passengerId}`);
      }

      return currentRide;
    } catch (error) {
      this.logger.error(`Failed to find current ride for passenger ${passengerId}`, error.stack);
      throw error;
    }
  }

  async findScheduledRides(startDate: Date, endDate: Date): Promise<RideDocument[]> {
    try {
      this.logger.debug(`Finding scheduled rides between ${startDate} and ${endDate}`);

      const rides = await this.model
        .find({
          status: RideStatus.SCHEDULED,
          scheduledTime: {
            $gte: startDate,
            $lte: endDate,
          },
        })
        .populate('passengerId', 'firstName lastName phone photo email')
        .populate('driverId', 'firstName lastName phone photo email rating')
        .sort({ scheduledTime: 1 })
        .exec();

      this.logger.debug(`Found ${rides.length} scheduled rides`);
      return rides;
    } catch (error) {
      this.logger.error(`Failed to find scheduled rides`, error.stack);
      throw error;
    }
  }

  async updateRideRating(
    rideId: string,
    raterId: Types.ObjectId,
    rating: number,
    review?: string,
    isDriverRating: boolean = false,
  ): Promise<RideDocument | null> {
    try {
      this.logger.debug(`Updating ride ${rideId} rating by ${raterId}`);

      const updateData = isDriverRating
        ? {
            driverRating: rating,
            driverReview: review,
            driverRatedAt: new Date(),
          }
        : {
            passengerRating: rating,
            passengerReview: review,
            passengerRatedAt: new Date(),
          };

      const updatedRide = await this.model
        .findByIdAndUpdate(rideId, updateData, {
          new: true,
          runValidators: true,
        })
        .exec();

      if (updatedRide) {
        this.logger.debug(`Updated ride ${rideId} with ${isDriverRating ? 'driver' : 'passenger'} rating: ${rating}`);
      }

      return updatedRide;
    } catch (error) {
      this.logger.error(`Failed to update ride rating for ride ${rideId}`, error.stack);
      throw error;
    }
  }

  async getRidesWithinTimeRange(startDate: Date, endDate: Date, status?: RideStatus[]): Promise<RideDocument[]> {
    try {
      this.logger.debug(`Finding rides between ${startDate} and ${endDate}`);

      const query: any = {
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      };

      if (status && status.length > 0) {
        query.status = { $in: status };
      }

      const rides = await this.model
        .find(query)
        .populate('passengerId', 'firstName lastName phone email')
        .populate('driverId', 'firstName lastName phone email rating')
        .sort({ createdAt: -1 })
        .exec();

      this.logger.debug(`Found ${rides.length} rides within time range`);
      return rides;
    } catch (error) {
      this.logger.error(`Failed to find rides within time range`, error.stack);
      throw error;
    }
  }

  async getRevenueStats(
    startDate: Date,
    endDate: Date,
    driverId?: Types.ObjectId,
  ): Promise<{
    totalRevenue: number;
    totalRides: number;
    averageFare: number;
    dailyStats: Array<{
      date: string;
      revenue: number;
      rides: number;
    }>;
  }> {
    try {
      this.logger.debug(
        `Getting revenue stats from ${startDate} to ${endDate}${driverId ? ` for driver ${driverId}` : ''}`,
      );

      const matchStage: any = {
        status: RideStatus.RIDE_COMPLETED,
        completedAt: {
          $gte: startDate,
          $lte: endDate,
        },
      };
      if (driverId) {
        matchStage.driverId = driverId;
      }

      const stats = await this.model
        .aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$completedAt',
                },
              },
              dailyRevenue: {
                $sum: { $ifNull: ['$finalFare', '$estimatedFare'] },
              },
              dailyRides: { $sum: 1 },
            },
          },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$dailyRevenue' },
              totalRides: { $sum: '$dailyRides' },
              dailyStats: {
                $push: {
                  date: '$_id',
                  revenue: '$dailyRevenue',
                  rides: '$dailyRides',
                },
              },
            },
          },
          {
            $addFields: {
              averageFare: {
                $cond: [{ $gt: ['$totalRides', 0] }, { $divide: ['$totalRevenue', '$totalRides'] }, 0],
              },
            },
          },
        ])
        .exec();

      const result =
        stats.length > 0
          ? stats[0]
          : {
              totalRevenue: 0,
              totalRides: 0,
              averageFare: 0,
              dailyStats: [],
            };

      // Remove the aggregation helper field
      delete result._id;

      // Sort daily stats by date
      result.dailyStats.sort((a: any, b: any) => a.date.localeCompare(b.date));

      this.logger.debug(`Revenue stats: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to get revenue stats`, error.stack);
      throw error;
    }
  }
}
