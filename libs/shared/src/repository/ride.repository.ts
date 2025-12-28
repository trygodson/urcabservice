import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AbstractRepository } from '../database';
import { Ride, RideDocument } from '../models/ride.schema';
import { RideStatus, RideType } from '../enums';

@Injectable()
export class RideRepository extends AbstractRepository<Ride> {
  protected readonly logger = new Logger(RideRepository.name);
  constructor(@InjectModel(Ride.name) rideModel: Model<Ride>) {
    super(rideModel);
  }

  async findById(rideId: string | Types.ObjectId): Promise<RideDocument | null> {
    try {
      return await this.model
        .findById(rideId)
        .populate('passengerId', 'firstName lastName phone photo email')
        .populate('driverId', 'firstName lastName phone photo email')
        .exec();
    } catch (error) {
      this.logger.error(`Failed to find ride by ID: ${rideId}`, error.stack);
      throw error;
    }
  }
  async findByIdAndDelete(rideId: string | Types.ObjectId): Promise<any | null> {
    try {
      return await this.model.deleteOne({ _id: rideId }).exec();
    } catch (error) {
      this.logger.error(`Failed to find ride by ID: ${rideId}`, error.stack);
      throw error;
    }
  }

  async findByIdAndUpdate(
    rideId: string | Types.ObjectId,
    updateData: Partial<Ride>,
    options: { new?: boolean; runValidators?: boolean } = { new: true, runValidators: true },
  ): Promise<Ride | null> {
    try {
      return await this.model
        .findByIdAndUpdate(rideId, updateData, options)
        .populate('passengerId', 'firstName lastName fullName phone photo email')
        .populate('driverId', 'firstName lastName fullName phone photo email')
        .lean()
        .exec();
    } catch (error) {
      this.logger.error(`Failed to update ride by ID: ${rideId}`, error.stack);
      throw error;
    }
  }

  async findPassengerRides(
    passengerId: Types.ObjectId,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ rides: RideDocument[]; total: number }> {
    const skip = (page - 1) * limit;

    const [rides, total] = await Promise.all([
      this.model
        .find({
          passengerId,
          status: {
            $in: [
              RideStatus.DRIVER_AT_PICKUPLOCATION,
              RideStatus.DRIVER_HAS_PICKUP_PASSENGER,
              RideStatus.RIDE_STARTED,
              RideStatus.RIDE_COMPLETED,
              RideStatus.RIDE_CANCELLED,
              RideStatus.RIDE_TIMEOUT,
              RideStatus.REJECTED_BY_DRIVER,
            ],
          },
        })
        .populate('driverId', 'firstName lastName fullName phone photo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.model.countDocuments({ passengerId }),
    ]);

    return { rides, total };
  }

  async findDriverRides(
    driverId: Types.ObjectId,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ rides: RideDocument[]; total: number }> {
    const skip = (page - 1) * limit;

    const [rides, total] = await Promise.all([
      this.model
        .find({ driverId })
        .populate('passengerId', 'firstName lastName phone photo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.model.countDocuments({ driverId }),
    ]);

    return { rides, total };
  }

  async findPassengerCurrentRide(passengerId: Types.ObjectId): Promise<RideDocument | null> {
    try {
      this.logger.debug(`Finding current ride for passenger ${passengerId}`);

      const currentRide = await this.model
        .findOne({
          passengerId,
          status: {
            $in: [
              RideStatus.DRIVER_ACCEPTED,
              RideStatus.DRIVER_AT_PICKUPLOCATION,
              RideStatus.DRIVER_HAS_PICKUP_PASSENGER,
              RideStatus.RIDE_STARTED,
            ],
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

  async findNearbyActiveRides(longitude: number, latitude: number, radiusInKm: number = 10): Promise<RideDocument[]> {
    return this.model
      .find({
        status: { $in: [RideStatus.SEARCHING_DRIVER, RideStatus.SCHEDULED] },
        pickupLocation: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
            $maxDistance: radiusInKm * 1000, // Convert km to meters
          },
        },
      })
      .populate('passengerId', 'firstName lastName phone photo')
      .exec();
  }

  async findScheduledRides(startTime: Date, endTime: Date): Promise<RideDocument[]> {
    return this.model
      .find({
        rideType: RideType.SCHEDULED,
        status: RideStatus.SCHEDULED,
        scheduledTime: {
          $gte: startTime,
          $lte: endTime,
        },
      })
      .populate('passengerId', 'firstName lastName phone photo')
      .exec();
  }

  async findActiveRideByPassenger(passengerId: Types.ObjectId): Promise<RideDocument | null> {
    return this.model
      .findOne({
        passengerId,
        status: {
          $in: [RideStatus.SEARCHING_DRIVER, RideStatus.DRIVER_ACCEPTED, RideStatus.RIDE_STARTED],
        },
      })
      .populate('driverId', 'firstName lastName phone photo')
      .exec();
  }

  async findActiveRideByDriver(driverId: Types.ObjectId): Promise<RideDocument | null> {
    return this.model
      .findOne({
        driverId,
        status: {
          $in: [
            RideStatus.DRIVER_ACCEPTED,
            RideStatus.DRIVER_AT_PICKUPLOCATION,
            RideStatus.DRIVER_HAS_PICKUP_PASSENGER,
            RideStatus.RIDE_STARTED,
          ],
        },
      })
      .populate('passengerId', 'firstName lastName phone photo')
      .exec();
  }

  async getRideStatistics(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalRides: number;
    completedRides: number;
    cancelledRides: number;
    totalRevenue: number;
    averageFare: number;
  }> {
    const stats = await this.model.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalRides: { $sum: 1 },
          completedRides: {
            $sum: { $cond: [{ $eq: ['$status', RideStatus.RIDE_COMPLETED] }, 1, 0] },
          },
          cancelledRides: {
            $sum: { $cond: [{ $eq: ['$status', RideStatus.RIDE_CANCELLED] }, 1, 0] },
          },
          totalRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$status', RideStatus.RIDE_COMPLETED] },
                { $ifNull: ['$finalFare', '$estimatedFare'] },
                0,
              ],
            },
          },
          averageFare: {
            $avg: {
              $cond: [
                { $eq: ['$status', RideStatus.RIDE_COMPLETED] },
                { $ifNull: ['$finalFare', '$estimatedFare'] },
                null,
              ],
            },
          },
        },
      },
    ]);

    return (
      stats[0] || {
        totalRides: 0,
        completedRides: 0,
        cancelledRides: 0,
        totalRevenue: 0,
        averageFare: 0,
      }
    );
  }

  async findRidesByStatus(
    status: RideStatus,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ rides: RideDocument[]; total: number }> {
    const skip = (page - 1) * limit;

    const [rides, total] = await Promise.all([
      this.model
        .find({ status })
        .populate('passengerId', 'firstName lastName phone photo')
        .populate('driverId', 'firstName lastName phone photo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.model.countDocuments({ status }),
    ]);

    return { rides, total };
  }

  async updateRideLocation(
    rideId: Types.ObjectId,
    currentLocation: { longitude: number; latitude: number },
  ): Promise<RideDocument | null> {
    return this.model
      .findByIdAndUpdate(
        rideId,
        {
          $push: {
            route: `${currentLocation.longitude},${currentLocation.latitude}`,
          },
        },
        { new: true },
      )
      .exec();
  }

  async findExpiredScheduledRides(): Promise<RideDocument[]> {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    return this.model
      .find({
        rideType: RideType.SCHEDULED,
        status: RideStatus.SCHEDULED,
        scheduledTime: { $lt: thirtyMinutesAgo },
      })
      .exec();
  }

  async getDriverEarnings(
    driverId: Types.ObjectId,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalEarnings: number;
    completedRides: number;
    averagePerRide: number;
  }> {
    const stats = await this.model.aggregate([
      {
        $match: {
          driverId,
          status: RideStatus.RIDE_COMPLETED,
          completedAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalEarnings: {
            $sum: { $ifNull: ['$finalFare', '$estimatedFare'] },
          },
          completedRides: { $sum: 1 },
          averagePerRide: {
            $avg: { $ifNull: ['$finalFare', '$estimatedFare'] },
          },
        },
      },
    ]);

    return (
      stats[0] || {
        totalEarnings: 0,
        completedRides: 0,
        averagePerRide: 0,
      }
    );
  }
}
