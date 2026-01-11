import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AbstractRepository } from './abstract.repository';
import { Vehicle, VehicleDocument } from '@urcab-workspace/shared';

@Injectable()
export class AdminVehicleRepository extends AbstractRepository<VehicleDocument> {
  constructor(@InjectModel(Vehicle.name) vehicleModel: Model<VehicleDocument>) {
    super(vehicleModel);
  }

  async find(
    filter: any,
    options: {
      populate?: any[];
      sort?: any;
      limit?: number;
      select?: string;
    } = {},
  ): Promise<VehicleDocument[]> {
    let query = this.model.find(filter);

    if (options.populate) {
      options.populate.forEach((populateOption) => {
        query = query.populate(populateOption);
      });
    }

    if (options.sort) {
      query = query.sort(options.sort);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.select) {
      query = query.select(options.select);
    }

    return query.exec();
  }

  async findById(id: string | Types.ObjectId): Promise<VehicleDocument | null> {
    return this.model.findById(typeof id === 'string' ? new Types.ObjectId(id) : id).exec();
  }

  async findOne(
    filter: any,
    options: {
      populate?: any[];
      select?: string;
    } = {},
  ): Promise<VehicleDocument | null> {
    let query = this.model.findOne(filter);

    if (options.populate) {
      options.populate.forEach((populateOption) => {
        query = query.populate(populateOption);
      });
    }

    if (options.select) {
      query = query.select(options.select);
    }

    return query.exec();
  }

  async findOneAndUpdate(
    filter: any,
    update: any,
    options: {
      new?: boolean;
      populate?: any[];
      select?: string;
    } = { new: true },
  ): Promise<VehicleDocument | null> {
    let query = this.model.findOneAndUpdate(filter, update, options);

    if (options.populate) {
      options.populate.forEach((populateOption) => {
        query = query.populate(populateOption);
      });
    }

    if (options.select) {
      query = query.select(options.select);
    }

    return query.exec();
  }

  async findWithPagination(
    filter: any,
    skip: number,
    limit: number,
    options: {
      populate?: any[];
      sort?: any;
      select?: string;
    } = {},
  ): Promise<VehicleDocument[]> {
    let query = this.model.find(filter).skip(skip).limit(limit);

    if (options.populate) {
      options.populate.forEach((populateOption) => {
        query = query.populate(populateOption);
      });
    }

    if (options.sort) {
      query = query.sort(options.sort);
    }

    if (options.select) {
      query = query.select(options.select);
    }

    return query.exec();
  }

  async countDocuments(filter: any = {}): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }
}
