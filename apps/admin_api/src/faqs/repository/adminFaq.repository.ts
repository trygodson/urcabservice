import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Faq, FaqDocument } from '@urcab-workspace/shared';

@Injectable()
export class AdminFaqRepository {
  protected readonly logger = new Logger(AdminFaqRepository.name);

  constructor(@InjectModel(Faq.name) readonly model: Model<FaqDocument>) {}

  async create(faq: Partial<Faq>): Promise<FaqDocument> {
    const newFaq = new this.model(faq);
    return newFaq.save();
  }

  async findOne(filterQuery: Record<string, any>): Promise<FaqDocument | null> {
    return this.model.findOne(filterQuery);
  }

  async findById(id: string): Promise<FaqDocument | null> {
    return this.model.findById(id);
  }

  async find(filterQuery: Record<string, any>): Promise<FaqDocument[]> {
    return this.model.find(filterQuery);
  }

  async findWithPagination(
    filterQuery: Record<string, any>,
    skip: number,
    limit: number,
    sortOptions?: { sort: Record<string, 1 | -1> },
  ): Promise<FaqDocument[]> {
    const query = this.model.find(filterQuery);

    if (sortOptions?.sort) {
      query.sort(sortOptions.sort);
    } else {
      // Default sort by order, then by createdAt
      query.sort({ order: 1, createdAt: -1 });
    }

    return query.skip(skip).limit(limit).exec();
  }

  async findByIdAndUpdate(id: string, update: Partial<Faq>): Promise<FaqDocument | null> {
    return this.model.findByIdAndUpdate(id, update, {
      new: true,
    });
  }

  async deleteOne(filterQuery: Record<string, any>): Promise<any> {
    return this.model.deleteOne(filterQuery);
  }

  async countDocuments(filterQuery: Record<string, any>): Promise<number> {
    return this.model.countDocuments(filterQuery);
  }
}

