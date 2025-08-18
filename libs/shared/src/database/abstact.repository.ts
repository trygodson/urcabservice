/* eslint-disable @typescript-eslint/no-unused-vars */
import { Logger, NotFoundException } from '@nestjs/common';
import { FilterQuery, Model, PopulateOption, PopulateOptions, SortOrder, Types, UpdateQuery } from 'mongoose';
import { AbstractDocument } from './abstact.schema';

export abstract class AbstractRepository<TDocument extends AbstractDocument> {
  protected abstract readonly logger: Logger;
  constructor(protected readonly model: Model<TDocument>) {}

  async create(document: Omit<TDocument, '_id'>): Promise<TDocument> {
    const createdDocument = new this.model({
      ...document,
      _id: new Types.ObjectId(),
    });
    return (await createdDocument.save()).toJSON() as unknown as TDocument;
  }

  async findOne(
    filterQuery: FilterQuery<TDocument>,
    populate: (string | PopulateOptions)[] = [],
    options: { select?: string } = {},
  ): Promise<TDocument> {
    // const document = await this.model
    //   .findOne(filterQuery)
    //   .lean<TDocument>(true);

    let query = this.model.findOne(filterQuery);

    // Apply population if provided
    if (populate.length > 0) {
      query = query.populate(populate);
    }

    if (options.select) {
      query = query.select(options.select);
    }

    const document = await query.lean<TDocument>(true);

    if (!document) {
      this.logger.warn('Document was not found with filterQuery', filterQuery);
      // throw new NotFoundException('Document was not found');
      return null;
    }

    return document;
  }
  async findById(
    id: string,
    populate: (string | PopulateOptions)[] = [],
    options: { select?: string } = {},
  ): Promise<TDocument> {
    // const document = await this.model
    //   .findOne(filterQuery)
    //   .lean<TDocument>(true);
    let query = this.model.findById(new Types.ObjectId(id));

    // Apply population if provided
    if (populate.length > 0) {
      query = query.populate(populate);
    }

    if (options.select) {
      query = query.select(options.select);
    }

    const document = await query.lean<TDocument>(true);

    if (!document) {
      this.logger.warn('Document was not found with filterQuery', id);
      // throw new NotFoundException('Document was not found');
      return null;
    }

    return document;
  }

  async findOneWithDocument(
    filterQuery: FilterQuery<TDocument>,
    populate: (string | PopulateOptions)[] = [],
  ): Promise<TDocument> {
    let query = this.model.findOne(filterQuery);

    if (populate.length > 0) {
      query = query.populate(populate);
    }

    const document = await query.exec();

    if (!document) {
      return null;
      // this.logger.warn('Document was not found with filterQuery', filterQuery);
      // throw new NotFoundException('Document was not found');
    }

    return document;
  }

  async findWithDocument(
    filterQuery: FilterQuery<TDocument>,
    populate: (string | PopulateOptions)[] = [],
  ): Promise<TDocument[]> {
    let query = this.model.find(filterQuery);

    if (populate.length > 0) {
      query = query.populate(populate);
    }

    return query.exec();
  }

  async findOneAndUpdate(
    filterQuery: FilterQuery<TDocument>,
    update: UpdateQuery<TDocument>,
    populate: (string | PopulateOptions)[] = [],
  ): Promise<TDocument> {
    let query = this.model.findOneAndUpdate(filterQuery, update, {
      new: true,
    });

    // Apply population if provided
    if (populate.length > 0) {
      query = query.populate(populate);
    }

    const document = await query.lean<TDocument>(true);

    if (!document) {
      this.logger.warn('Document was not found with filterQuery', filterQuery);
      throw new NotFoundException('Document was not found');
    }

    return document;
  }

  async find(filterQuery: FilterQuery<TDocument>, populate: (string | PopulateOptions)[] = []): Promise<TDocument[]> {
    let query = this.model.find(filterQuery).sort();

    // Apply population if provided
    if (populate.length > 0) {
      query = query.populate(populate);
    }
    if (populate.sort) {
      query = query.sort();
    }

    return query.lean<TDocument[]>(true);
  }

  async findSort(
    filterQuery: FilterQuery<TDocument>,
    sort: any,
    populate: (string | PopulateOptions)[] = [],
  ): Promise<TDocument[]> {
    let query = this.model.find(filterQuery).sort(sort);

    // Apply population if provided
    if (populate.length > 0) {
      query = query.populate(populate);
    }

    return query.lean<TDocument[]>(true);
  }

  async findOneAndDelete(
    filterQuery: FilterQuery<TDocument>,
    populate: (string | PopulateOptions)[] = [],
  ): Promise<TDocument> {
    let query = this.model.findOneAndDelete(filterQuery);

    // Apply population if provided
    if (populate.length > 0) {
      query = query.populate(populate);
    }

    const document = await query.lean<TDocument>(true);

    if (!document) {
      this.logger.warn('Document was not found with filterQuery', filterQuery);
      throw new NotFoundException('Document was not found');
    }

    return document;
  }

  async count(filterQuery: FilterQuery<TDocument> = {}): Promise<number> {
    return this.model.countDocuments(filterQuery);
  }

  async updateMany(
    filterQuery: FilterQuery<TDocument>,
    update: UpdateQuery<TDocument>,
  ): Promise<{ modifiedCount: number; matchedCount: number }> {
    const result = await this.model.updateMany(filterQuery, update);
    return {
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
    };
  }
}
