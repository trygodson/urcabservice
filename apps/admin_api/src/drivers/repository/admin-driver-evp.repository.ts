import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DriverEvp, DriverEvpDocument, VehicleEvp } from '@urcab-workspace/shared';

@Injectable()
export class AdminDriverEvpRepository {
  protected readonly logger = new Logger(AdminDriverEvpRepository.name);

  constructor(
    @InjectModel(DriverEvp.name)
    readonly model: Model<DriverEvpDocument>,
  ) {}

  async create(createDriverEvp: Partial<VehicleEvp>): Promise<DriverEvpDocument> {
    const driverEvp = new this.model(createDriverEvp);
    return driverEvp.save();
  }

  async findOne(filterQuery: Record<string, any>): Promise<DriverEvpDocument> {
    return this.model.findOne(filterQuery);
  }

  async findById(id: string): Promise<DriverEvpDocument> {
    return this.model.findById(id);
  }

  async find(filterQuery: Record<string, any>): Promise<DriverEvpDocument[]> {
    return this.model.find(filterQuery);
  }

  async findDriverActiveEvp(driverId: Types.ObjectId | string): Promise<DriverEvpDocument | null> {
    const objectId = typeof driverId === 'string' ? new Types.ObjectId(driverId) : driverId;

    return this.findOne({
      driverId: objectId,
      isActive: true,
      endDate: { $gt: new Date() }, // Not expired
      revokedAt: { $exists: false }, // Not revoked
    });
  }

  async findOneAndUpdate(filterQuery: Record<string, any>, update: Partial<VehicleEvp>): Promise<DriverEvpDocument> {
    return this.model.findOneAndUpdate(filterQuery, update, {
      new: true,
    });
  }

  async findDriverEvps(
    driverId: Types.ObjectId | string,
    page: number = 1,
    limit: number = 10,
    activeOnly: boolean = false,
  ): Promise<{ evps: DriverEvpDocument[]; total: number }> {
    const objectId = typeof driverId === 'string' ? new Types.ObjectId(driverId) : driverId;
    const skip = (page - 1) * limit;

    const filterQuery: Record<string, any> = { driverId: objectId };

    if (activeOnly) {
      filterQuery.isActive = true;
      filterQuery.endDate = { $gt: new Date() };
      filterQuery.revokedAt = { $exists: false };
    }

    const [evps, total] = await Promise.all([
      this.model.find(filterQuery).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.model.countDocuments(filterQuery).exec(),
    ]);

    return { evps, total };
  }
}
