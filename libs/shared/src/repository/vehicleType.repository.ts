import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AbstractRepository } from '../database';
import { VehicleType, VehicleTypeDocument } from '../models/vehicleType.schema';

@Injectable()
export class VehicleTypeRepository extends AbstractRepository<VehicleTypeDocument> {
  protected logger = new Logger(VehicleTypeRepository.name);
  constructor(
    @InjectModel(VehicleType.name)
    vehicleTypeModel: Model<VehicleTypeDocument>,
  ) {
    super(vehicleTypeModel);
  }

  async findOneByName(name: string): Promise<VehicleTypeDocument> {
    return this.findOne({ name });
  }

  async findActiveVehicleTypes(): Promise<VehicleTypeDocument[]> {
    return this.find({ isActive: true });
  }

  async getVehicleTypeById(vehicleTypeId: Types.ObjectId): Promise<VehicleTypeDocument> {
    return this.findOne({ _id: vehicleTypeId });
  }
}
