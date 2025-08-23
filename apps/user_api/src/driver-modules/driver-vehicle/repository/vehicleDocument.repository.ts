import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AbstractRepository,
  VehicleDocumentRecord,
  VehicleDocumentRecordDocument,
  VehicleDocumentStatus,
  VehicleDocumentType,
} from '@urcab-workspace/shared';

@Injectable()
export class VehicleDocumentRepository extends AbstractRepository<VehicleDocumentRecordDocument> {
  protected readonly logger = new Logger(VehicleDocumentRepository.name);

  constructor(
    @InjectModel(VehicleDocumentRecord.name)
    vehicleDocumentModel: Model<VehicleDocumentRecordDocument>,
  ) {
    super(vehicleDocumentModel);
  }

  async createVehicleDocument(
    vehicleId: Types.ObjectId,
    driverId: Types.ObjectId,
    documentData: Partial<VehicleDocumentRecord>,
  ): Promise<VehicleDocumentRecordDocument> {
    try {
      // Check if document already exists for this vehicle and type
      const existingDocument = await this.model.findOne({
        vehicleId,
        documentType: documentData.documentType,
        isActive: true,
      });

      if (existingDocument) {
        // Create new version and mark old one as inactive
        await this.model.findByIdAndUpdate(existingDocument._id, {
          isActive: false,
        });

        // Set version and previous version reference
        documentData.version = (existingDocument.version || 1) + 1;
        documentData.previousVersionId = existingDocument._id;
      }

      const document = new this.model({
        ...documentData,
        _id: new Types.ObjectId(),
        vehicleId,
        uploadedByDriverId: driverId,
        uploadedAt: new Date(),
        status: VehicleDocumentStatus.PENDING,
        isActive: true,
        version: documentData.version || 1,
      });

      return await document.save();
    } catch (error) {
      this.logger.error(`Failed to create vehicle document for vehicle ${vehicleId}`, error.stack);
      throw error;
    }
  }

  async updateVehicleDocument(
    documentId: Types.ObjectId,
    updateData: Partial<VehicleDocumentRecord>,
  ): Promise<VehicleDocumentRecordDocument | null> {
    try {
      return await this.model
        .findByIdAndUpdate(
          documentId,
          {
            ...updateData,
            updatedAt: new Date(),
          },
          { new: true, runValidators: true },
        )
        .exec();
    } catch (error) {
      this.logger.error(`Failed to update vehicle document ${documentId}`, error.stack);
      throw error;
    }
  }

  async getVehicleDocumentByType(
    vehicleId: Types.ObjectId,
    documentType: VehicleDocumentType,
  ): Promise<VehicleDocumentRecordDocument | null> {
    try {
      return await this.model
        .findOne({
          vehicleId,
          documentType,
          isActive: true,
        })
        .exec();
    } catch (error) {
      this.logger.error(`Failed to get vehicle document by type for vehicle ${vehicleId}`, error.stack);
      throw error;
    }
  }

  async getAllVehicleDocuments(
    vehicleId: Types.ObjectId,
    includeInactive: boolean = false,
  ): Promise<VehicleDocumentRecordDocument[]> {
    try {
      const query: any = { vehicleId };

      if (!includeInactive) {
        query.isActive = true;
      }

      return await this.model.find(query).sort({ documentType: 1, version: -1 }).exec();
    } catch (error) {
      this.logger.error(`Failed to get all vehicle documents for vehicle ${vehicleId}`, error.stack);
      throw error;
    }
  }

  async getDocumentsByDriverId(
    driverId: Types.ObjectId,
    includeInactive: boolean = false,
  ): Promise<VehicleDocumentRecordDocument[]> {
    try {
      const query: any = { uploadedByDriverId: driverId };

      if (!includeInactive) {
        query.isActive = true;
      }

      return await this.model
        .find(query)
        .populate('vehicleId', 'make model licensePlate')
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      this.logger.error(`Failed to get documents for driver ${driverId}`, error.stack);
      throw error;
    }
  }

  async getVehicleDocumentById(documentId: Types.ObjectId): Promise<VehicleDocumentRecordDocument | null> {
    try {
      return await this.model.findById(documentId).populate('vehicleId', 'make model licensePlate driverId').exec();
    } catch (error) {
      this.logger.error(`Failed to get vehicle document by id ${documentId}`, error.stack);
      throw error;
    }
  }

  async getExpiringDocuments(daysAhead: number = 30): Promise<VehicleDocumentRecordDocument[]> {
    try {
      const expiryThreshold = new Date();
      expiryThreshold.setDate(expiryThreshold.getDate() + daysAhead);

      return await this.model
        .find({
          isActive: true,
          status: VehicleDocumentStatus.VERIFIED,
          expiryDate: {
            $exists: true,
            $lte: expiryThreshold,
            $gte: new Date(),
          },
        })
        .populate('vehicleId', 'make model licensePlate driverId')
        .populate('uploadedByDriverId', 'firstName lastName email phone')
        .exec();
    } catch (error) {
      this.logger.error('Failed to get expiring vehicle documents', error.stack);
      throw error;
    }
  }

  async getDocumentsByStatus(
    status: VehicleDocumentStatus,
    limit: number = 50,
    skip: number = 0,
  ): Promise<{ documents: VehicleDocumentRecordDocument[]; total: number }> {
    try {
      const [documents, total] = await Promise.all([
        this.model
          .find({ status, isActive: true })
          .populate('vehicleId', 'make model licensePlate driverId')
          .populate('uploadedByDriverId', 'firstName lastName email phone')
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip)
          .exec(),
        this.model.countDocuments({ status, isActive: true }),
      ]);

      return { documents, total };
    } catch (error) {
      this.logger.error(`Failed to get vehicle documents by status ${status}`, error.stack);
      throw error;
    }
  }

  async updateExpiryFlags(): Promise<void> {
    try {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      // Mark documents expiring soon
      await this.model.updateMany(
        {
          isActive: true,
          expiryDate: {
            $exists: true,
            $lte: thirtyDaysFromNow,
            $gte: new Date(),
          },
          isExpiringSoon: false,
        },
        {
          isExpiringSoon: true,
        },
      );

      // Unmark documents not expiring soon
      await this.model.updateMany(
        {
          isActive: true,
          $or: [
            { expiryDate: { $exists: false } },
            { expiryDate: { $gt: thirtyDaysFromNow } },
            { expiryDate: { $lt: new Date() } },
          ],
          isExpiringSoon: true,
        },
        {
          isExpiringSoon: false,
        },
      );
    } catch (error) {
      this.logger.error('Failed to update expiry flags for vehicle documents', error.stack);
      throw error;
    }
  }

  async verifyDocumentOwnership(documentId: Types.ObjectId, driverId: Types.ObjectId): Promise<boolean> {
    try {
      const document = await this.model.findById(documentId).exec();
      return document ? document.uploadedByDriverId.toString() === driverId.toString() : false;
    } catch (error) {
      this.logger.error(
        `Failed to verify document ownership for document ${documentId} and driver ${driverId}`,
        error.stack,
      );
      return false;
    }
  }

  async getVehicleDocumentHistory(
    vehicleId: Types.ObjectId,
    documentType: VehicleDocumentType,
  ): Promise<VehicleDocumentRecordDocument[]> {
    try {
      return await this.model
        .find({
          vehicleId,
          documentType,
        })
        .sort({ version: -1 })
        .exec();
    } catch (error) {
      this.logger.error(
        `Failed to get document history for vehicle ${vehicleId} and type ${documentType}`,
        error.stack,
      );
      throw error;
    }
  }

  async getRequiredDocumentTypes(): Promise<VehicleDocumentType[]> {
    // In Malaysia, these are typically required for taxi/ride-sharing vehicles
    return [
      VehicleDocumentType.CAR_INSURANCE,
      VehicleDocumentType.PUSPAKOM_INSPECTION,
      VehicleDocumentType.TAXI_PERMIT_VEHICLE,
    ];
  }

  async checkDocumentCompleteness(vehicleId: Types.ObjectId): Promise<{
    isComplete: boolean;
    missingDocuments: VehicleDocumentType[];
    verifiedDocuments: VehicleDocumentType[];
  }> {
    try {
      const requiredTypes = await this.getRequiredDocumentTypes();
      const existingDocuments = await this.model
        .find({
          vehicleId,
          isActive: true,
        })
        .exec();

      const verifiedDocuments: VehicleDocumentType[] = [];
      const uploadedTypes = new Set<VehicleDocumentType>();

      existingDocuments.forEach((doc) => {
        uploadedTypes.add(doc.documentType as VehicleDocumentType);
        if (doc.status === VehicleDocumentStatus.VERIFIED) {
          verifiedDocuments.push(doc.documentType as VehicleDocumentType);
        }
      });

      const missingDocuments = requiredTypes.filter((type) => !uploadedTypes.has(type));
      const isComplete =
        missingDocuments.length === 0 && requiredTypes.every((type) => verifiedDocuments.includes(type));

      return {
        isComplete,
        missingDocuments,
        verifiedDocuments,
      };
    } catch (error) {
      this.logger.error(`Failed to check document completeness for vehicle ${vehicleId}`, error.stack);
      throw error;
    }
  }
}
