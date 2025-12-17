import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractRepository } from '../database';
import { AdminRole, RoleDocument } from '../models';

@Injectable()
export class RoleRepository extends AbstractRepository<RoleDocument> {
  protected readonly logger = new Logger(RoleRepository.name);

  constructor(@InjectModel(AdminRole.name) roleModel: Model<RoleDocument>) {
    super(roleModel);
  }

  async findActiveRoles(): Promise<RoleDocument[]> {
    return this.find({ isActive: true });
  }

  async findByName(name: string): Promise<RoleDocument | null> {
    return this.findOne({ name });
  }

  async findByIdWithPermissions(roleId: string): Promise<RoleDocument | null> {
    return this.findOne({ _id: roleId }, ['permissions']);
  }

  async findSystemRoles(): Promise<RoleDocument[]> {
    return this.find({ isSystemRole: true });
  }
}

