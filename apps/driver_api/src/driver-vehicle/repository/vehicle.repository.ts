import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AbstractRepository, Vehicle, VehicleDocument, VehicleStatus } from '@urcab-workspace/shared';

@Injectable()
export class VehicleRepository extends AbstractRepository<VehicleDocument> {
  protected readonly logger = new Logger(VehicleRepository.name);

  constructor(
    @InjectModel(Vehicle.name)
    vehicleModel: Model<VehicleDocument>,
  ) {
    super(vehicleModel);
  }

  async createVehicle(driverId: Types.ObjectId, vehicleData: Partial<Vehicle>): Promise<VehicleDocument> {
    try {
      // If this is set as primary, unset other primary vehicles for this driver
      if (vehicleData.isPrimary) {
        await this.model.updateMany({ driverId, isPrimary: true }, { isPrimary: false });
      }

      const vehicle = new this.model({
        ...vehicleData,
        _id: new Types.ObjectId(),
        driverId,
        status: VehicleStatus.PENDING_VERIFICATION,
        isActive: true,
        hasCompleteDocumentation: false,
      });

      return await vehicle.save();
    } catch (error) {
      this.logger.error(`Failed to create vehicle for driver ${driverId}`, error.stack);
      throw error;
    }
  }

  async updateVehicle(vehicleId: Types.ObjectId, updateData: Partial<Vehicle>): Promise<VehicleDocument | null> {
    try {
      // If setting as primary, unset other primary vehicles for this driver
      if (updateData.isPrimary) {
        const vehicle = await this.model.findById(vehicleId);
        if (vehicle) {
          await this.model.updateMany(
            { driverId: vehicle.driverId, isPrimary: true, _id: { $ne: vehicleId } },
            { isPrimary: false },
          );
        }
      }

      return await this.model
        .findByIdAndUpdate(
          vehicleId,
          {
            ...updateData,
            updatedAt: new Date(),
          },
          { new: true, runValidators: true },
        )
        .exec();
    } catch (error) {
      this.logger.error(`Failed to update vehicle ${vehicleId}`, error.stack);
      throw error;
    }
  }

  async getDriverVehicles(driverId: Types.ObjectId, includeInactive: boolean = false): Promise<VehicleDocument[]> {
    try {
      const query: any = { driverId };

      if (!includeInactive) {
        query.isActive = true;
      }

      return await this.model.find(query).sort({ isPrimary: -1, createdAt: -1 }).exec();
    } catch (error) {
      this.logger.error(`Failed to get vehicles for driver ${driverId}`, error.stack);
      throw error;
    }
  }

  async getVehicleById(vehicleId: Types.ObjectId): Promise<VehicleDocument | null> {
    try {
      return await this.model.findById(vehicleId).exec();
    } catch (error) {
      this.logger.error(`Failed to get vehicle by id ${vehicleId}`, error.stack);
      throw error;
    }
  }

  async getDriverPrimaryVehicle(driverId: Types.ObjectId): Promise<VehicleDocument | null> {
    try {
      return await this.model
        .findOne({
          driverId,
          isPrimary: true,
          isActive: true,
        })
        .exec();
    } catch (error) {
      this.logger.error(`Failed to get primary vehicle for driver ${driverId}`, error.stack);
      throw error;
    }
  }

  async checkLicensePlateExists(licensePlate: string, excludeVehicleId?: Types.ObjectId): Promise<boolean> {
    try {
      const query: any = {
        licensePlate: { $regex: new RegExp(`^${licensePlate}$`, 'i') },
        isActive: true,
      };

      if (excludeVehicleId) {
        query._id = { $ne: excludeVehicleId };
      }

      const vehicle = await this.model.findOne(query).exec();
      return !!vehicle;
    } catch (error) {
      this.logger.error(`Failed to check license plate existence for ${licensePlate}`, error.stack);
      throw error;
    }
  }

  async checkVinExists(vin: string, excludeVehicleId?: Types.ObjectId): Promise<boolean> {
    try {
      const query: any = {
        vin: { $regex: new RegExp(`^${vin}$`, 'i') },
        isActive: true,
      };

      if (excludeVehicleId) {
        query._id = { $ne: excludeVehicleId };
      }

      const vehicle = await this.model.findOne(query).exec();
      return !!vehicle;
    } catch (error) {
      this.logger.error(`Failed to check VIN existence for ${vin}`, error.stack);
      throw error;
    }
  }

  async verifyVehicleOwnership(vehicleId: Types.ObjectId, driverId: Types.ObjectId): Promise<boolean> {
    try {
      const vehicle = await this.model.findById(vehicleId).exec();
      return vehicle ? vehicle.driverId.toString() === driverId.toString() : false;
    } catch (error) {
      this.logger.error(
        `Failed to verify vehicle ownership for vehicle ${vehicleId} and driver ${driverId}`,
        error.stack,
      );
      return false;
    }
  }

  async getVehiclesByStatus(
    status: VehicleStatus,
    limit: number = 50,
    skip: number = 0,
  ): Promise<{ vehicles: VehicleDocument[]; total: number }> {
    try {
      const [vehicles, total] = await Promise.all([
        this.model
          .find({ status, isActive: true })
          .populate('driverId', 'firstName lastName email phone')
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip)
          .exec(),
        this.model.countDocuments({ status, isActive: true }),
      ]);

      return { vehicles, total };
    } catch (error) {
      this.logger.error(`Failed to get vehicles by status ${status}`, error.stack);
      throw error;
    }
  }

  async updateDocumentationStatus(vehicleId: Types.ObjectId, hasCompleteDocumentation: boolean): Promise<void> {
    try {
      await this.model.findByIdAndUpdate(vehicleId, {
        hasCompleteDocumentation,
        lastDocumentVerificationCheck: new Date(),
      });
    } catch (error) {
      this.logger.error(`Failed to update documentation status for vehicle ${vehicleId}`, error.stack);
      throw error;
    }
  }
}
