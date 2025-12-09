import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PricingZone, PricingZoneDocument } from '@urcab-workspace/shared';

@Injectable()
export class AdminPricingZoneRepository {
  protected readonly logger = new Logger(AdminPricingZoneRepository.name);

  constructor(
    @InjectModel(PricingZone.name)
    readonly model: Model<PricingZoneDocument>,
  ) {}

  async create(pricingZone: Partial<PricingZone>): Promise<PricingZoneDocument> {
    const newZone = new this.model(pricingZone);
    return newZone.save();
  }

  async findOne(filterQuery: Record<string, any>): Promise<PricingZoneDocument> {
    return this.model.findOne(filterQuery);
  }

  async findById(id: string): Promise<PricingZoneDocument> {
    return this.model.findById(id);
  }

  async find(filterQuery: Record<string, any>): Promise<PricingZoneDocument[]> {
    return this.model.find(filterQuery);
  }

  async findWithPagination(
    filterQuery: Record<string, any>,
    skip: number,
    limit: number,
    options?: Record<string, any>,
  ): Promise<PricingZoneDocument[]> {
    const query = this.model.find(filterQuery);

    if (options?.sort) {
      query.sort(options.sort);
    }

    if (options?.populate) {
      options.populate.forEach((populateOption: any) => {
        query.populate(populateOption);
      });
    }

    return query.skip(skip).limit(limit).exec();
  }

  async findOneAndUpdate(filterQuery: Record<string, any>, update: Partial<PricingZone>): Promise<PricingZoneDocument> {
    return this.model.findOneAndUpdate(filterQuery, update, {
      new: true,
    });
  }

  async findOneAndDelete(filterQuery: Record<string, any>): Promise<PricingZoneDocument> {
    return this.model.findOneAndDelete(filterQuery);
  }

  async countDocuments(filterQuery: Record<string, any>): Promise<number> {
    return this.model.countDocuments(filterQuery);
  }

  async findZoneForLocation(longitude: number, latitude: number): Promise<PricingZoneDocument | null> {
    // Find zone containing the given coordinates using MongoDB's $geoIntersects
    return this.model.findOne({
      isActive: true,
      boundaries: {
        $geoIntersects: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
        },
      },
    });
  }
}
