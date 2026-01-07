import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Types } from 'mongoose';
import {
  PricingZone,
  PricingZoneDocument,
  PricingZoneRepository,
  Ride,
  RideDocument,
  RideStatus,
} from '@urcab-workspace/shared';
import { GetReportsDto, TimePeriod, ReportsResponseDto, ZoneDataDto, TotalRidesDataDto, RevenueAnalyticsDataDto } from './dto';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectModel(Ride.name)
    private readonly rideModel: Model<RideDocument>,
    @InjectModel(PricingZone.name)
    private readonly pricingZoneModel: Model<PricingZoneDocument>,
    private readonly pricingZoneRepository: PricingZoneRepository,
  ) {}

  async getReports(query: GetReportsDto): Promise<ReportsResponseDto> {
    const { period = TimePeriod.DAY } = query;

    // Get date range based on period
    const { startDate, endDate, groupByFormat, useWeekGrouping } = this.getDateRange(period);

    // Get all active pricing zones
    const zones = await this.pricingZoneRepository.findActiveZones();

    // Get rides by zone
    const ridesByZone = await this.getRidesByZone(zones, startDate, endDate);

    // Get revenue by zone
    const revenueByZone = await this.getRevenueByZone(zones, startDate, endDate);

    // Get total rides over time
    const totalRides = await this.getTotalRidesOverTime(startDate, endDate, groupByFormat, useWeekGrouping, period);

    // Get revenue analytics
    const revenueAnalytics = await this.getRevenueAnalytics(period, startDate, endDate, groupByFormat, useWeekGrouping);

    return {
      ridesByZone,
      revenueByZone,
      totalRides,
      revenueAnalytics,
    };
  }

  private getDateRange(period: TimePeriod) {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;
    let groupByFormat: string;
    let useWeekGrouping: boolean = false;

    switch (period) {
      case TimePeriod.DAY:
        // Last 7 days
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        groupByFormat = '%Y-%m-%d';
        break;
      case TimePeriod.WEEK:
        // Last 7 weeks
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 49);
        useWeekGrouping = true;
        break;
      case TimePeriod.MONTH:
        // Last 12 months
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 12);
        groupByFormat = '%Y-%m';
        break;
    }

    return { startDate, endDate, groupByFormat, useWeekGrouping };
  }

  private async getRidesByZone(
    zones: PricingZoneDocument[],
    startDate: Date,
    endDate: Date,
  ): Promise<ZoneDataDto[]> {
    const zoneData: ZoneDataDto[] = [];

    // Get all completed rides in the date range
    const allRides = await this.rideModel.find({
      status: RideStatus.RIDE_COMPLETED,
      createdAt: { $gte: startDate, $lte: endDate },
    });

    for (const zone of zones) {
      const matchingRides = new Set<string>();

      for (const ride of allRides) {
        const pickupCoords = ride.pickupLocation?.coordinates;
        const dropoffCoords = ride.dropoffLocation?.coordinates;

        // Check if pickup is in zone
        if (pickupCoords && pickupCoords.length === 2) {
          const distance = this.calculateDistance(
            pickupCoords[0],
            pickupCoords[1],
            zone.location.coordinates[0],
            zone.location.coordinates[1],
          );
          if (distance <= zone.radiusKm) {
            matchingRides.add(ride._id.toString());
            continue;
          }
        }

        // Check if dropoff is in zone
        if (dropoffCoords && dropoffCoords.length === 2) {
          const distance = this.calculateDistance(
            dropoffCoords[0],
            dropoffCoords[1],
            zone.location.coordinates[0],
            zone.location.coordinates[1],
          );
          if (distance <= zone.radiusKm) {
            matchingRides.add(ride._id.toString());
          }
        }
      }

      zoneData.push({
        zone: zone.name,
        trips: matchingRides.size,
        revenue: 0, // Will be calculated in revenueByZone
      });
    }

    // Sort by trips descending
    return zoneData.sort((a, b) => b.trips - a.trips);
  }

  private async getRevenueByZone(
    zones: PricingZoneDocument[],
    startDate: Date,
    endDate: Date,
  ): Promise<ZoneDataDto[]> {
    const zoneData: ZoneDataDto[] = [];

    // Get all completed rides in the date range
    const allRides = await this.rideModel.find({
      status: RideStatus.RIDE_COMPLETED,
      createdAt: { $gte: startDate, $lte: endDate },
    });

    for (const zone of zones) {
      const matchingRides = new Map<string, RideDocument>();

      for (const ride of allRides) {
        const pickupCoords = ride.pickupLocation?.coordinates;
        const dropoffCoords = ride.dropoffLocation?.coordinates;
        const rideId = ride._id.toString();

        // Check if pickup is in zone
        if (pickupCoords && pickupCoords.length === 2) {
          const distance = this.calculateDistance(
            pickupCoords[0],
            pickupCoords[1],
            zone.location.coordinates[0],
            zone.location.coordinates[1],
          );
          if (distance <= zone.radiusKm) {
            if (!matchingRides.has(rideId)) {
              matchingRides.set(rideId, ride);
            }
            continue;
          }
        }

        // Check if dropoff is in zone
        if (dropoffCoords && dropoffCoords.length === 2) {
          const distance = this.calculateDistance(
            dropoffCoords[0],
            dropoffCoords[1],
            zone.location.coordinates[0],
            zone.location.coordinates[1],
          );
          if (distance <= zone.radiusKm) {
            if (!matchingRides.has(rideId)) {
              matchingRides.set(rideId, ride);
            }
          }
        }
      }

      // Calculate total revenue
      let totalRevenue = 0;
      matchingRides.forEach((ride) => {
        // Calculate revenue: estimatedFare + tips + tollAmount
        const baseFare = ride.estimatedFare || 0;
        const tips = ride.tips || 0;
        const tollAmount = ride.tollAmount || 0;
        totalRevenue += baseFare + tips + tollAmount;
      });

      zoneData.push({
        zone: zone.name,
        trips: matchingRides.size,
        revenue: Math.round(totalRevenue * 100) / 100, // Round to 2 decimal places
      });
    }

    // Sort by revenue descending
    return zoneData.sort((a, b) => b.revenue - a.revenue);
  }

  private async getTotalRidesOverTime(
    startDate: Date,
    endDate: Date,
    groupByFormat: string,
    useWeekGrouping: boolean,
    period: TimePeriod,
  ): Promise<TotalRidesDataDto[]> {
    let aggregation: any[];

    if (useWeekGrouping) {
      aggregation = [
        {
          $match: {
            status: RideStatus.RIDE_COMPLETED,
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
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
            trips: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ];
    } else {
      aggregation = [
        {
          $match: {
            status: RideStatus.RIDE_COMPLETED,
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: groupByFormat, date: '$createdAt' },
            },
            trips: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ];
    }

    const results = await this.rideModel.aggregate(aggregation);

    if (period === TimePeriod.DAY) {
      // Format as day names for daily view
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const now = new Date();
      const last7Days: TotalRidesDataDto[] = [];

      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const dateKey = date.toISOString().split('T')[0];
        const dayName = dayNames[date.getDay()];

        const result = results.find((r) => r._id === dateKey);
        last7Days.push({
          date: dayName,
          trips: result?.trips || 0,
        });
      }

      return last7Days;
    } else {
      return results.map((result) => ({
        date: result._id,
        trips: result.trips,
      }));
    }
  }

  private async getRevenueAnalytics(
    period: TimePeriod,
    startDate: Date,
    endDate: Date,
    groupByFormat: string,
    useWeekGrouping: boolean,
  ): Promise<RevenueAnalyticsDataDto[]> {
    // Calculate last period dates
    const periodDuration = endDate.getTime() - startDate.getTime();
    const lastPeriodStartDate = new Date(startDate.getTime() - periodDuration);
    const lastPeriodEndDate = new Date(startDate.getTime() - 1);

    // Get current period revenue
    const currentPeriodRevenue = await this.getRevenueOverTime(
      startDate,
      endDate,
      groupByFormat,
      useWeekGrouping,
      period,
    );

    // Get last period revenue
    const lastPeriodRevenue = await this.getRevenueOverTime(
      lastPeriodStartDate,
      lastPeriodEndDate,
      groupByFormat,
      useWeekGrouping,
      period,
    );

    // Combine and format
    const revenueMap = new Map<string, { current: number; lastPeriod?: number }>();

    currentPeriodRevenue.forEach((item) => {
      revenueMap.set(item.date, { current: item.revenue });
    });

    lastPeriodRevenue.forEach((item) => {
      const existing = revenueMap.get(item.date);
      if (existing) {
        existing.lastPeriod = item.revenue;
      } else {
        revenueMap.set(item.date, { current: 0, lastPeriod: item.revenue });
      }
    });

    // Convert to array and add trend (using current as trend for now)
    return Array.from(revenueMap.entries())
      .map(([date, data]) => ({
        date,
        current: data.current,
        lastPeriod: data.lastPeriod,
        revenueTrend: data.current, // Trend is same as current for now
      }))
      .sort((a, b) => {
        // Sort by date
        if (period === TimePeriod.DAY) {
          const dayOrder = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          return dayOrder.indexOf(a.date) - dayOrder.indexOf(b.date);
        }
        return a.date.localeCompare(b.date);
      });
  }

  private async getRevenueOverTime(
    startDate: Date,
    endDate: Date,
    groupByFormat: string,
    useWeekGrouping: boolean,
    period: TimePeriod,
  ): Promise<{ date: string; revenue: number }[]> {
    let aggregation: any[];

    if (useWeekGrouping) {
      aggregation = [
        {
          $match: {
            status: RideStatus.RIDE_COMPLETED,
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
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
            totalRevenue: {
              $add: [
                { $ifNull: ['$estimatedFare', 0] },
                { $ifNull: ['$tips', 0] },
                { $ifNull: ['$tollAmount', 0] },
              ],
            },
          },
        },
        {
          $group: {
            _id: '$weekString',
            revenue: { $sum: '$totalRevenue' },
          },
        },
        { $sort: { _id: 1 } },
      ];
    } else {
      aggregation = [
        {
          $match: {
            status: RideStatus.RIDE_COMPLETED,
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $addFields: {
            totalRevenue: {
              $add: [
                { $ifNull: ['$estimatedFare', 0] },
                { $ifNull: ['$tips', 0] },
                { $ifNull: ['$tollAmount', 0] },
              ],
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: groupByFormat, date: '$createdAt' },
            },
            revenue: { $sum: '$totalRevenue' },
          },
        },
        { $sort: { _id: 1 } },
      ];
    }

    const results = await this.rideModel.aggregate(aggregation);

    if (period === TimePeriod.DAY) {
      // Format as day names for daily view
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const now = new Date();
      const last7Days: { date: string; revenue: number }[] = [];

      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const dateKey = date.toISOString().split('T')[0];
        const dayName = dayNames[date.getDay()];

        const result = results.find((r) => r._id === dateKey);
        last7Days.push({
          date: dayName,
          revenue: Math.round((result?.revenue || 0) * 100) / 100,
        });
      }

      return last7Days;
    } else {
      return results.map((result) => ({
        date: result._id,
        revenue: Math.round(result.revenue * 100) / 100,
      }));
    }
  }

  // Helper to calculate distance between two points using Haversine formula
  private calculateDistance(lon1: number, lat1: number, lon2: number, lat2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }

  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}

