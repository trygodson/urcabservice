import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractRepository } from './abstract.repository';
import { User, UserDocument } from '@urcab-workspace/shared';

@Injectable()
export class AdminUserRepository extends AbstractRepository<UserDocument> {
  constructor(@InjectModel(User.name) userModel: Model<UserDocument>) {
    super(userModel);
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.model.findById(id).exec();
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
  ): Promise<UserDocument[]> {
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

  async findOne(
    filter: any,
    options: {
      populate?: any[];
      select?: string;
    } = {},
  ): Promise<UserDocument | null> {
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

  async find(
    filter: any,
    options: {
      populate?: any[];
      sort?: any;
      limit?: number;
      select?: string;
    } = {},
  ): Promise<UserDocument[]> {
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

  async findOneAndUpdate(
    filter: any,
    update: any,
    options: {
      new?: boolean;
      populate?: any[];
      select?: string;
    } = { new: true },
  ): Promise<UserDocument | null> {
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
}
