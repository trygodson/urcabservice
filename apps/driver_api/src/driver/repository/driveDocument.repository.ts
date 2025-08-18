import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  AbstractRepository,
  DocumentStatus,
  DocumentType,
  DriverDocument,
  DriverDocumentDocument,
  User,
} from '@urcab-workspace/shared';
import { Model, Types } from 'mongoose';

@Injectable()
export class DriverDocumentRepository extends AbstractRepository<DriverDocumentDocument> {
  protected readonly logger = new Logger(DriverDocumentRepository.name);

  constructor(
    @InjectModel(DriverDocument.name)
    driverDocumentModel: Model<DriverDocumentDocument>,
    @InjectModel(User.name)
    user: Model<DriverDocument>,
  ) {
    super(driverDocumentModel);
  }

  async createDriverDocument(
    driverId: Types.ObjectId,
    documentData: Partial<DriverDocument>,
  ): Promise<DriverDocumentDocument> {
    try {
      // Check if document already exists for this driver and type
      const existingDocument = await this.model.findOne({
        driverId,
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
      console.log(driverId, '=======driver id=====', '6895e688e9b5d454d35108a5');
      const document = new this.model({
        ...documentData,
        driverId,
        _id: new Types.ObjectId(),
        uploadedAt: new Date(),
        status: DocumentStatus.PENDING,
        isActive: true,
        version: documentData.version || 1,
      });

      return await document.save();
    } catch (error) {
      this.logger.error(`Failed to create driver document for driver ${driverId}`, error.stack);
      throw error;
    }
  }

  async updateDriverDocument(
    documentId: Types.ObjectId,
    updateData: Partial<DriverDocument>,
  ): Promise<DriverDocumentDocument | null> {
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
      this.logger.error(`Failed to update driver document ${documentId}`, error.stack);
      throw error;
    }
  }

  async getDriverDocumentByType(
    driverId: Types.ObjectId,
    documentType: DocumentType,
  ): Promise<DriverDocumentDocument | null> {
    try {
      return await this.model
        .findOne({
          driverId,
          documentType,
          isActive: true,
        })
        .exec();
    } catch (error) {
      this.logger.error(`Failed to get driver document by type for driver ${driverId}`, error.stack);
      throw error;
    }
  }

  async getAllDriverDocuments(
    driverId: Types.ObjectId,
    includeInactive: boolean = false,
  ): Promise<DriverDocumentDocument[]> {
    try {
      const query: any = { driverId };

      if (!includeInactive) {
        query.isActive = true;
      }

      return await this.model.find(query).sort({ documentType: 1, version: -1 }).exec();
    } catch (error) {
      this.logger.error(`Failed to get all driver documents for driver ${driverId}`, error.stack);
      throw error;
    }
  }

  async getDriverDocumentById(documentId: Types.ObjectId): Promise<DriverDocumentDocument | null> {
    try {
      return await this.model.findById(documentId).exec();
    } catch (error) {
      this.logger.error(`Failed to get driver document by id ${documentId}`, error.stack);
      throw error;
    }
  }

  async getExpiringDocuments(daysAhead: number = 30): Promise<DriverDocumentDocument[]> {
    try {
      const expiryThreshold = new Date();
      expiryThreshold.setDate(expiryThreshold.getDate() + daysAhead);

      return await this.model
        .find({
          isActive: true,
          status: DocumentStatus.VERIFIED,
          expiryDate: {
            $exists: true,
            $lte: expiryThreshold,
            $gte: new Date(),
          },
        })
        .populate('driverId', 'firstName lastName email phone')
        .exec();
    } catch (error) {
      this.logger.error('Failed to get expiring documents', error.stack);
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
      this.logger.error('Failed to update expiry flags', error.stack);
      throw error;
    }
  }

  async getDocumentsByStatus(
    status: DocumentStatus,
    limit: number = 50,
    skip: number = 0,
  ): Promise<{ documents: DriverDocumentDocument[]; total: number }> {
    try {
      const [documents, total] = await Promise.all([
        this.model
          .find({ status, isActive: true })
          .populate('driverId', 'firstName lastName email phone')
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip)
          .exec(),
        this.model.countDocuments({ status, isActive: true }),
      ]);

      return { documents, total };
    } catch (error) {
      this.logger.error(`Failed to get documents by status ${status}`, error.stack);
      throw error;
    }
  }

  async getDriverDocumentHistory(
    driverId: Types.ObjectId,
    documentType: DocumentType,
  ): Promise<DriverDocumentDocument[]> {
    try {
      return await this.model
        .find({
          driverId,
          documentType,
        })
        .sort({ version: -1 })
        .exec();
    } catch (error) {
      this.logger.error(`Failed to get document history for driver ${driverId} and type ${documentType}`, error.stack);
      throw error;
    }
  }
}
