import { Model, Document, FilterQuery, UpdateQuery, QueryOptions } from 'mongoose';
import { NotFoundException } from '@nestjs/common';

export abstract class AbstractRepository<TDocument extends Document> {
  constructor(protected readonly model: Model<TDocument>) {}

  async create(createDto: any): Promise<TDocument> {
    const createdDocument = new this.model(createDto);
    return createdDocument.save();
  }

  async findOne(
    filterQuery: FilterQuery<TDocument>,
    options: {
      populate?: any[];
      select?: string;
    } = {},
  ): Promise<TDocument | null> {
    let query = this.model.findOne(filterQuery);

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
    filterQuery: FilterQuery<TDocument>,
    updateQuery: UpdateQuery<TDocument>,
    options: QueryOptions & {
      populate?: any[];
      select?: string;
    } = { new: true },
  ): Promise<TDocument | null> {
    let query = this.model.findOneAndUpdate(filterQuery, updateQuery, options);

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
    filterQuery: FilterQuery<TDocument>,
    options: {
      populate?: any[];
      sort?: any;
      limit?: number;
      select?: string;
    } = {},
  ): Promise<TDocument[]> {
    let query = this.model.find(filterQuery);

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

  async findWithPagination(
    filterQuery: FilterQuery<TDocument>,
    skip: number,
    limit: number,
    options: {
      populate?: any[];
      sort?: any;
      select?: string;
    } = {},
  ): Promise<TDocument[]> {
    let query = this.model.find(filterQuery).skip(skip).limit(limit);

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

  async findOneAndDelete(filterQuery: FilterQuery<TDocument>, options: QueryOptions = {}): Promise<TDocument | null> {
    return this.model.findOneAndDelete(filterQuery, options).exec();
  }

  async deleteMany(filterQuery: FilterQuery<TDocument>): Promise<any> {
    return this.model.deleteMany(filterQuery).exec();
  }

  async updateMany(
    filterQuery: FilterQuery<TDocument>,
    updateQuery: UpdateQuery<TDocument>,
    options: any = {},
  ): Promise<any> {
    return this.model.updateMany(filterQuery, updateQuery, options).exec();
  }

  async countDocuments(filterQuery: FilterQuery<TDocument> = {}): Promise<number> {
    return this.model.countDocuments(filterQuery).exec();
  }

  async exists(filterQuery: FilterQuery<TDocument>): Promise<boolean> {
    const count = await this.model.countDocuments(filterQuery).limit(1).exec();
    return count > 0;
  }

  async aggregate(pipeline: any[]): Promise<any[]> {
    return this.model.aggregate(pipeline).exec();
  }

  async distinct(field: string, filterQuery: FilterQuery<TDocument> = {}): Promise<any[]> {
    return this.model.distinct(field, filterQuery).exec();
  }
}
