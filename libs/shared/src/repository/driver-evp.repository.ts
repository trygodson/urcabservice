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

  async findDriverActiveEvp(vehicleId: Types.ObjectId | string): Promise<DriverEvpDocument | null> {
    const objectId = typeof vehicleId === 'string' ? new Types.ObjectId(vehicleId) : vehicleId;

    return this.findOne({
      vehicleId: objectId,
      isActive: true,
      endDate: { $gt: new Date() }, // Not expired
      revokedAt: { $exists: false }, // Not revoked
    });
  }

  async findDriverEvps(
    vehicleId: Types.ObjectId | string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ evps: DriverEvpDocument[]; total: number }> {
    const objectId = typeof vehicleId === 'string' ? new Types.ObjectId(vehicleId) : vehicleId;
    const skip = (page - 1) * limit;

    const [evps, total] = await Promise.all([
      this.model.find({ vehicleId: objectId }).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.model.countDocuments({ vehicleId: objectId }).exec(),
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
