import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Types } from 'mongoose';
import {
  Ride,
  RideDocument,
  RideStatus,
  User,
  UserDocument,
  Role,
  DriverDocument,
  DriverDocumentSchema,
  DriverDocumentDocument,
  VehicleDocumentRecord,
  VehicleDocumentSchema,
  VehicleDocumentRecordDocument,
  DriverLocation,
  DriverLocationDocument,
  DriverEvp,
  DriverEvpDocument,
  DriverOnlineStatus,
  DocumentStatus,
  VehicleDocumentStatus,
} from '@urcab-workspace/shared';
import { GetDashboardStatisticsDto, TimePeriod } from './dto';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectModel(Ride.name)
    private readonly rideModel: Model<RideDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(DriverDocument.name)
    private readonly driverDocumentModel: Model<DriverDocumentDocument>,
    @InjectModel(VehicleDocumentRecord.name)
    private readonly vehicleDocumentModel: Model<VehicleDocumentRecordDocument>,
    @InjectModel(DriverLocation.name)
    private readonly driverLocationModel: Model<DriverLocationDocument>,
    @InjectModel(DriverEvp.name)
    private readonly driverEvpModel: Model<DriverEvpDocument>,
  ) {}

  async getDashboardStatistics(query: GetDashboardStatisticsDto) {
    const { ridePeriod = TimePeriod.DAY, evpPeriod = TimePeriod.MONTH } = query;

    // Get overall statistics
    const overallStatistics = await this.getOverallStatistics();

    // Get passenger ride statistics
    const passengerRideStatistics = await this.getPassengerRideStatistics(ridePeriod);

    // Get driver status
    const driverStatus = await this.getDriverStatus();

    // Get approved EVP statistics
    const approvedEvp = await this.getApprovedEvpStatistics(evpPeriod);

    return {
      overallStatistics,
      passengerRideStatistics,
      driverStatus,
      approvedEvp,
    };
  }

  private async getOverallStatistics() {
    const [totalRides, activeDrivers, totalDrivers, pendingDocuments, pendingVehicleDocuments] = await Promise.all([
      // Total rides
      this.rideModel.countDocuments({}),

      // Active drivers (online status)
      this.driverLocationModel.countDocuments({
        status: DriverOnlineStatus.ONLINE,
        isAvailableForRides: true,
      }),

      // Total drivers
      this.userModel.countDocuments({ type: Role.DRIVER }),

      // Pending driver documents
      this.driverDocumentModel.countDocuments({
        status: DocumentStatus.PENDING,
      }),

      // Pending vehicle documents
      this.vehicleDocumentModel.countDocuments({
        status: VehicleDocumentStatus.PENDING,
      }),
    ]);

    return {
      totalRides,
      activeDrivers,
      totalDrivers,
      pendingDocuments,
      pendingVehicleDocuments,
    };
  }

  private async getPassengerRideStatistics(period: TimePeriod) {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;
    let groupByFormat: string;
    let useWeekGrouping: boolean = false;

    switch (period) {
      case TimePeriod.DAY:
        // Last 7 days - group by actual date
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        groupByFormat = '%Y-%m-%d';
        break;
      case TimePeriod.WEEK:
        // Last 7 weeks
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 49); // 7 weeks
        useWeekGrouping = true;
        break;
      case TimePeriod.MONTH:
        // Last 12 months
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 12);
        groupByFormat = '%Y-%m';
        break;
    }

    // Aggregate rides by date
    const completedRides = await this.rideModel.aggregate([
      {
        $match: {
          status: RideStatus.RIDE_COMPLETED,
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      ...(useWeekGrouping
        ? [
            {
              $addFields: {
                weekString: {
                  $concat: [
                    { $toString: { $year: '$createdAt' } },
                    '-W',
                    {
                      $toString: {
                        $cond: {
                          if: { $lt: [{ $week: '$createdAt' }, 10] },
                          then: { $concat: ['0', { $toString: { $week: '$createdAt' } }] },
                          else: { $toString: { $week: '$createdAt' } },
                        },
                      },
                    },
                  ],
                },
              },
            },
            {
              $group: {
                _id: '$weekString',
                count: { $sum: 1 },
              },
            },
          ]
        : [
            {
              $group: {
                _id: {
                  $dateToString: { format: groupByFormat, date: '$createdAt' },
                },
                count: { $sum: 1 },
              },
            },
          ]),
      { $sort: { _id: 1 } },
    ]);

    const cancelledRides = await this.rideModel.aggregate([
      {
        $match: {
          status: RideStatus.RIDE_CANCELLED,
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      ...(useWeekGrouping
        ? [
            {
              $addFields: {
                weekString: {
                  $concat: [
                    { $toString: { $year: '$createdAt' } },
                    '-W',
                    {
                      $toString: {
                        $cond: {
                          if: { $lt: [{ $week: '$createdAt' }, 10] },
                          then: { $concat: ['0', { $toString: { $week: '$createdAt' } }] },
                          else: { $toString: { $week: '$createdAt' } },
                        },
                      },
                    },
                  ],
                },
              },
            },
            {
              $group: {
                _id: '$weekString',
                count: { $sum: 1 },
              },
            },
          ]
        : [
            {
              $group: {
                _id: {
                  $dateToString: { format: groupByFormat, date: '$createdAt' },
                },
                count: { $sum: 1 },
              },
            },
          ]),
      { $sort: { _id: 1 } },
    ]);

    // Create maps for quick lookup
    const completedMap = new Map(completedRides.map((r) => [r._id, r.count]));
    const cancelledMap = new Map(cancelledRides.map((r) => [r._id, r.count]));

    // Get all unique dates
    const allDates = new Set([...completedRides.map((r) => r._id), ...cancelledRides.map((r) => r._id)]);

    let data: Array<{ date: string; completedRides: number; cancelledRides: number }>;

    if (period === TimePeriod.DAY) {
      // For daily view, generate last 7 days and format as day names
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const last7Days: string[] = [];

      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const dateKey = date.toISOString().split('T')[0];
        last7Days.push(dateKey);
      }

      data = last7Days.map((dateKey) => {
        const date = new Date(dateKey);
        const dayName = dayNames[date.getDay()];
        return {
          date: dayName,
          completedRides: completedMap.get(dateKey) || 0,
          cancelledRides: cancelledMap.get(dateKey) || 0,
        };
      });
    } else {
      // Format data for week/month views
      data = Array.from(allDates)
        .sort()
        .map((date) => ({
          date,
          completedRides: completedMap.get(date) || 0,
          cancelledRides: cancelledMap.get(date) || 0,
        }));
    }

    return { data };
  }

  private async getDriverStatus() {
    const [activeDrivers, inactiveDrivers, onRideDrivers] = await Promise.all([
      // Active drivers (online and available)
      this.driverLocationModel.countDocuments({
        status: DriverOnlineStatus.ONLINE,
        isAvailableForRides: true,
      }),

      // Inactive drivers (offline)
      this.driverLocationModel.countDocuments({
        status: DriverOnlineStatus.OFFLINE,
      }),

      // On ride drivers (busy or has currentRideId)
      this.driverLocationModel.countDocuments({
        $or: [{ status: DriverOnlineStatus.BUSY }, { currentRideId: { $exists: true, $ne: null } }],
      }),
    ]);

    return {
      activeDrivers,
      inactiveDrivers,
      onRideDrivers,
    };
  }

  private async getApprovedEvpStatistics(period: TimePeriod) {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;
    let groupByFormat: string;
    let useWeekGrouping: boolean = false;

    switch (period) {
      case TimePeriod.WEEK:
        // Last 12 weeks
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 84); // 12 weeks
        useWeekGrouping = true;
        break;
      case TimePeriod.MONTH:
        // Last 12 months
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 12);
        groupByFormat = '%Y-%m';
        break;
      default:
        // Default to month if day is selected
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 12);
        groupByFormat = '%Y-%m';
    }

    // Aggregate approved EVPs by date (using startDate as the approval date)
    const evpStats = await this.driverEvpModel.aggregate([
      {
        $match: {
          isActive: true,
          startDate: { $gte: startDate, $lte: endDate },
        },
      },
      ...(useWeekGrouping
        ? [
            {
              $addFields: {
                weekString: {
                  $concat: [
                    { $toString: { $year: '$startDate' } },
                    '-W',
                    {
                      $toString: {
                        $cond: {
                          if: { $lt: [{ $week: '$startDate' }, 10] },
                          then: { $concat: ['0', { $toString: { $week: '$startDate' } }] },
                          else: { $toString: { $week: '$startDate' } },
                        },
                      },
                    },
                  ],
                },
              },
            },
            {
              $group: {
                _id: '$weekString',
                count: { $sum: 1 },
              },
            },
          ]
        : [
            {
              $group: {
                _id: {
                  $dateToString: { format: groupByFormat, date: '$startDate' },
                },
                count: { $sum: 1 },
              },
            },
          ]),
      { $sort: { _id: 1 } },
    ]);

    const data = evpStats.map((stat) => ({
      date: stat._id,
      count: stat.count,
    }));

    return { data };
  }
}
