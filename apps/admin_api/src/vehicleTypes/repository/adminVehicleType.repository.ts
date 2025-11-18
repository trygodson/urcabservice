import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractRepository } from '@urcab-workspace/shared';
import { VehicleType, VehicleTypeDocument } from '@urcab-workspace/shared';

@Injectable()
export class AdminVehicleTypeRepository extends AbstractRepository<VehicleTypeDocument> {
  protected logger = new Logger(AdminVehicleTypeRepository.name);
  constructor(
    @InjectModel(VehicleType.name)
    vehicleTypeModel: Model<VehicleTypeDocument>,
  ) {
    super(vehicleTypeModel);
  }

  async createVehicleType(vehicleType: VehicleType): Promise<VehicleTypeDocument> {
    const createdDocument = new this.model(vehicleType);
    return (await createdDocument.save()).toJSON() as unknown as VehicleTypeDocument;
  }

  async updateVehicleType(vehicleType: VehicleType): Promise<VehicleTypeDocument> {
    return this.model.findByIdAndUpdate(vehicleType._id, vehicleType, { new: true }) as unknown as VehicleTypeDocument;
  }

  async deleteVehicleType(vehicleType: VehicleType): Promise<VehicleTypeDocument> {
    return this.model.findByIdAndDelete(vehicleType._id) as unknown as VehicleTypeDocument;
  }

  async getVehicleTypeById(vehicleType: VehicleType): Promise<VehicleTypeDocument> {
    return this.model.findById(vehicleType._id) as unknown as VehicleTypeDocument;
  }
}
