import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AbstractRepository } from '../database';
import { DriverEvp, DriverEvpDocument } from '../models/driver-evp.schema';

@Injectable()
export class DriverEvpRepository extends AbstractRepository<DriverEvpDocument> {
  protected readonly logger = new Logger(DriverEvpRepository.name);

  constructor(
    @InjectModel(DriverEvp.name)
    driverEvpModel: Model<DriverEvpDocument>,
  ) {
    super(driverEvpModel);
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

  async findDriverEvps(
    driverId: Types.ObjectId | string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ evps: DriverEvpDocument[]; total: number }> {
    const objectId = typeof driverId === 'string' ? new Types.ObjectId(driverId) : driverId;
    const skip = (page - 1) * limit;

    const [evps, total] = await Promise.all([
      this.model.find({ driverId: objectId }).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.model.countDocuments({ driverId: objectId }).exec(),
    ]);

    return { evps, total };
  }

  async revokeEvp(evpId: Types.ObjectId | string, adminId: Types.ObjectId | string): Promise<DriverEvpDocument | null> {
    const evpObjectId = typeof evpId === 'string' ? new Types.ObjectId(evpId) : evpId;
    const adminObjectId = typeof adminId === 'string' ? new Types.ObjectId(adminId) : adminId;

    return this.findOneAndUpdate(
      { _id: evpObjectId, isActive: true },
      {
        isActive: false,
        revokedAt: new Date(),
        revokedBy: adminObjectId,
      },
    );
  }
}
