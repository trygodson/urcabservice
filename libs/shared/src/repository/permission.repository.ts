import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractRepository } from '../database';
import { Permission, PermissionDocument } from '../models';

@Injectable()
export class PermissionRepository extends AbstractRepository<PermissionDocument> {
  protected readonly logger = new Logger(PermissionRepository.name);

  constructor(@InjectModel(Permission.name) permissionModel: Model<PermissionDocument>) {
    super(permissionModel);
  }

  async findByCategory(category: string): Promise<PermissionDocument[]> {
    return this.find({ category, isActive: true });
  }

  async findByName(name: string): Promise<PermissionDocument | null> {
    return this.findOne({ name, isActive: true });
  }

  async findByIds(ids: string[]): Promise<PermissionDocument[]> {
    return this.find({ _id: { $in: ids }, isActive: true });
  }
}

