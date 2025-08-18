import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractRepository } from '../database';
import { Vehicle, VehicleDocument } from '../models';

@Injectable()
export class VehicleRepository extends AbstractRepository<VehicleDocument> {
  protected readonly logger = new Logger(VehicleRepository.name);

  constructor(@InjectModel(Vehicle.name) vehicleModel: Model<VehicleDocument>) {
    super(vehicleModel);
  }

  /**
   * Find vehicles by driver ID
   */
  async findByDriverId(driverId: string): Promise<VehicleDocument[]> {
    return this.find({ driverId, isActive: true });
  }

  /**
   * Find primary vehicle for a driver
   */
  async findPrimaryVehicle(driverId: string): Promise<VehicleDocument | null> {
    return this.findOne({ driverId, isPrimary: true, isActive: true });
  }

  /**
   * Find vehicles by status
   */
  async findByStatus(status: string): Promise<VehicleDocument[]> {
    return this.find({ status });
  }

  /**
   * Find pending verification vehicles
   */
  async findPendingVerification(): Promise<VehicleDocument[]> {
    return this.model
      .find({ status: 'pending_verification' })
      .sort({ createdAt: -1 })
      .populate('driverId', 'firstName lastName email phone')
      .exec();
  }

  /**
   * Set primary vehicle (ensures only one primary vehicle per driver)
   */
  async setPrimaryVehicle(driverId: string, vehicleId: string): Promise<VehicleDocument> {
    // First, remove primary status from all other vehicles for this driver
    await this.model.updateMany({ driverId, _id: { $ne: vehicleId } }, { isPrimary: false }).exec();

    // Then set the specified vehicle as primary
    return this.findOneAndUpdate({ _id: vehicleId, driverId }, { isPrimary: true, isActive: true });
  }

  /**
   * Verify vehicle
   */
  async verifyVehicle(
    vehicleId: string,
    verifiedByAdminId: string,
    verificationNotes?: string,
  ): Promise<VehicleDocument> {
    return this.findOneAndUpdate(
      { _id: vehicleId },
      {
        status: 'verified',
        verifiedByAdminId,
        verifiedAt: new Date(),
        verificationNotes,
      },
    );
  }

  /**
   * Reject vehicle verification
   */
  async rejectVehicle(vehicleId: string, rejectionReason: string): Promise<VehicleDocument> {
    return this.findOneAndUpdate(
      { _id: vehicleId },
      {
        status: 'rejected',
        rejectionReason,
      },
    );
  }

  /**
   * Suspend vehicle
   */
  async suspendVehicle(vehicleId: string, reason: string): Promise<VehicleDocument> {
    return this.findOneAndUpdate(
      { _id: vehicleId },
      {
        status: 'suspended',
        rejectionReason: reason,
        isActive: false,
      },
    );
  }

  /**
   * Check if license plate is unique
   */
  async isLicensePlateUnique(licensePlate: string, excludeId?: string): Promise<boolean> {
    const query: any = { licensePlate };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const existingVehicle = await this.findOne(query);
    return !existingVehicle;
  }

  /**
   * Check if VIN is unique
   */
  async isVinUnique(vin: string, excludeId?: string): Promise<boolean> {
    const query: any = { vin };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const existingVehicle = await this.findOne(query);
    return !existingVehicle;
  }

  /**
   * Find vehicles with expiring documents
   */
  async findVehiclesWithExpiringDocuments(daysFromNow: number = 30): Promise<VehicleDocument[]> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysFromNow);

    return this.model
      .find({
        status: 'verified',
        isActive: true,
        $or: [{ registrationExpiryDate: { $lte: expiryDate } }, { insuranceExpiryDate: { $lte: expiryDate } }],
      })
      .populate('driverId', 'firstName lastName email phone')
      .exec();
  }

  /**
   * Find vehicles needing inspection
   */
  async findVehiclesNeedingInspection(): Promise<VehicleDocument[]> {
    const today = new Date();

    return this.model
      .find({
        status: 'verified',
        isActive: true,
        nextInspectionDue: { $lte: today },
      })
      .populate('driverId', 'firstName lastName email phone')
      .exec();
  }

  /**
   * Update vehicle inspection
   */
  async updateInspection(
    vehicleId: string,
    lastInspectionDate: Date,
    nextInspectionDue: Date,
  ): Promise<VehicleDocument> {
    return this.findOneAndUpdate(
      { _id: vehicleId },
      {
        lastInspectionDate,
        nextInspectionDue,
      },
    );
  }

  /**
   * Count vehicles by status
   */
  async countVehiclesByStatus(): Promise<any> {
    return this.model
      .aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ])
      .exec();
  }

  /**
   * Find vehicles by make and model
   */
  async findByMakeAndModel(make: string, model: string): Promise<VehicleDocument[]> {
    return this.find({
      make: { $regex: new RegExp(make, 'i') },
      model: { $regex: new RegExp(model, 'i') },
      status: 'verified',
      isActive: true,
    });
  }

  /**
   * Find vehicles by features
   */
  async findByFeatures(features: string[]): Promise<VehicleDocument[]> {
    return this.find({
      features: { $in: features },
      status: 'verified',
      isActive: true,
    });
  }

  /**
   * Get vehicle statistics for a driver
   */
  async getDriverVehicleStats(driverId: string): Promise<any> {
    return this.model
      .aggregate([
        { $match: { driverId } },
        {
          $group: {
            _id: null,
            totalVehicles: { $sum: 1 },
            activeVehicles: {
              $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] },
            },
            verifiedVehicles: {
              $sum: { $cond: [{ $eq: ['$status', 'verified'] }, 1, 0] },
            },
            pendingVehicles: {
              $sum: { $cond: [{ $eq: ['$status', 'pending_verification'] }, 1, 0] },
            },
          },
        },
      ])
      .exec();
  }

  /**
   * Deactivate all vehicles for a driver
   */
  async deactivateAllDriverVehicles(driverId: string): Promise<void> {
    await this.model.updateMany({ driverId }, { isActive: false }).exec();
  }
}
