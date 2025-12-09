import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AbstractRepository } from '../database';
import { PricingZone, PricingZoneDocument } from '../models/pricing-zone.schema';

@Injectable()
export class PricingZoneRepository extends AbstractRepository<PricingZoneDocument> {
  protected logger = new Logger(PricingZoneRepository.name);

  constructor(
    @InjectModel(PricingZone.name)
    pricingZoneModel: Model<PricingZoneDocument>,
  ) {
    super(pricingZoneModel);
  }

  async findActiveZones(): Promise<PricingZoneDocument[]> {
    return this.find({ isActive: true });
  }

  async findZoneForLocation(longitude: number, latitude: number): Promise<PricingZoneDocument | null> {
    // Find zones where the point is within the radius of the zone's center
    // Convert radiusKm to meters for $maxDistance
    return this.find({
      isActive: true,
    }).then((zones) => {
      // Calculate distances manually and filter
      const point = [longitude, latitude];
      const matchingZones = zones.filter((zone) => {
        // Calculate distance between point and zone center
        const centerPoint = zone.location.coordinates;
        const distance = this.calculateDistance(point[0], point[1], centerPoint[0], centerPoint[1]);

        // If distance is less than radius, it's a match
        return distance <= zone.radiusKm;
      });

      // Sort by smallest radius (for most specific zone)
      matchingZones.sort((a, b) => a.radiusKm - b.radiusKm);

      return matchingZones[0] || null;
    });
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

  async findZonesForLocation(longitude: number, latitude: number): Promise<PricingZoneDocument[]> {
    // Find all zones where the point is within the radius of the zone's center
    return this.find({
      isActive: true,
    }).then((zones) => {
      // Calculate distances manually and filter
      const point = [longitude, latitude];
      return zones.filter((zone) => {
        // Calculate distance between point and zone center
        const centerPoint = zone.location.coordinates;
        const distance = this.calculateDistance(point[0], point[1], centerPoint[0], centerPoint[1]);

        // If distance is less than radius, it's a match
        return distance <= zone.radiusKm;
      });
    });
  }
}
