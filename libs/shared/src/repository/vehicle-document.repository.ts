import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractRepository } from '../database';
import { VehicleDocumentRecord, VehicleDocumentRecordDocument } from '../models';

@Injectable()
export class VehicleDocumentRepository extends AbstractRepository<VehicleDocumentRecordDocument> {
  protected readonly logger = new Logger(VehicleDocumentRepository.name);

  constructor(@InjectModel(VehicleDocumentRecord.name) vehicleDocumentModel: Model<VehicleDocumentRecordDocument>) {
    super(vehicleDocumentModel);
  }

  /**
   * Find all documents for a vehicle
   */
  async findByVehicleId(vehicleId: string): Promise<VehicleDocumentRecordDocument[]> {
    return this.find({ vehicleId, isActive: true });
  }

  /**
   * Find document by type for a vehicle
   */
  async findByVehicleIdAndType(vehicleId: string, documentType: string): Promise<VehicleDocumentRecordDocument | null> {
    return this.findOne({ vehicleId, documentType, isActive: true });
  }

  /**
   * Find documents by driver ID
   */
  async findByDriverId(driverId: string): Promise<VehicleDocumentRecordDocument[]> {
    return this.find({ uploadedByDriverId: driverId, isActive: true });
  }

  /**
   * Find documents by status
   */
  async findByStatus(status: string): Promise<VehicleDocumentRecordDocument[]> {
    return this.find({ status, isActive: true });
  }

  /**
   * Find pending verification documents
   */
  async findPendingVerification(): Promise<VehicleDocumentRecordDocument[]> {
    return this.model
      .find({ status: 'pending', isActive: true })
      .sort({ createdAt: -1 })
      .populate('vehicleId', 'make model licensePlate')
      .populate('uploadedByDriverId', 'firstName lastName email phone')
      .exec();
  }

  /**
   * Find documents expiring soon
   */
  async findExpiringDocuments(daysFromNow: number = 30): Promise<VehicleDocumentRecordDocument[]> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysFromNow);

    return this.model
      .find({
        expiryDate: {
          $gte: new Date(),
          $lte: expiryDate,
        },
        status: 'verified',
        isActive: true,
      })
      .populate('vehicleId', 'make model licensePlate')
      .populate('uploadedByDriverId', 'firstName lastName email phone fcmToken')
      .exec();
  }

  /**
   * Find expired documents
   */
  async findExpiredDocuments(): Promise<VehicleDocumentRecordDocument[]> {
    return this.find({
      expiryDate: { $lt: new Date() },
      status: { $ne: 'expired' },
      isActive: true,
    });
  }

  /**
   * Mark documents as expired
   */
  async markDocumentsAsExpired(): Promise<void> {
    await this.model
      .updateMany(
        {
          expiryDate: { $lt: new Date() },
          status: { $ne: 'expired' },
          isActive: true,
        },
        { status: 'expired' },
      )
      .exec();
  }

  /**
   * Verify document
   */
  async verifyDocument(
    documentId: string,
    verifiedByAdminId: string,
    verificationNotes?: string,
  ): Promise<VehicleDocumentRecordDocument> {
    return this.findOneAndUpdate(
      { _id: documentId },
      {
        status: 'verified',
        verifiedByAdminId,
        verifiedAt: new Date(),
        verificationNotes,
      },
    );
  }

  /**
   * Reject document
   */
  async rejectDocument(documentId: string, rejectionReason: string): Promise<VehicleDocumentRecordDocument> {
    return this.findOneAndUpdate(
      { _id: documentId },
      {
        status: 'rejected',
        rejectionReason,
        rejectedAt: new Date(),
      },
    );
  }

  /**
   * Check if vehicle has all required documents verified
   */
  async hasAllRequiredDocuments(vehicleId: string): Promise<boolean> {
    const requiredDocuments = ['car_insurance', 'puspakom_inspection', 'taxi_permit_vehicle'];

    for (const docType of requiredDocuments) {
      const document = await this.findByVehicleIdAndType(vehicleId, docType);
      if (!document || document.status !== 'verified') {
        return false;
      }
    }
    return true;
  }

  /**
   * Get missing required documents for a vehicle
   */
  async getMissingRequiredDocuments(vehicleId: string): Promise<string[]> {
    const requiredDocuments = ['car_insurance', 'puspakom_inspection', 'taxi_permit_vehicle'];

    const missingDocuments: string[] = [];

    for (const docType of requiredDocuments) {
      const document = await this.findByVehicleIdAndType(vehicleId, docType);
      if (!document || document.status !== 'verified') {
        missingDocuments.push(docType);
      }
    }

    return missingDocuments;
  }

  /**
   * Get vehicle verification status
   */
  async getVehicleVerificationStatus(vehicleId: string): Promise<any> {
    const documents = await this.findByVehicleId(vehicleId);

    const status = {
      totalDocuments: documents.length,
      verifiedDocuments: documents.filter((doc) => doc.status === 'verified').length,
      pendingDocuments: documents.filter((doc) => doc.status === 'pending').length,
      rejectedDocuments: documents.filter((doc) => doc.status === 'rejected').length,
      expiredDocuments: documents.filter((doc) => doc.status === 'expired').length,
      isFullyVerified: false,
      missingDocuments: [] as string[],
    };

    status.missingDocuments = await this.getMissingRequiredDocuments(vehicleId);
    status.isFullyVerified = status.missingDocuments.length === 0;

    return status;
  }

  /**
   * Find documents by type
   */
  async findByDocumentType(documentType: string): Promise<VehicleDocumentRecordDocument[]> {
    return this.find({ documentType, isActive: true });
  }

  /**
   * Count documents by status
   */
  async countDocumentsByStatus(): Promise<any> {
    return this.model
      .aggregate([
        { $match: { isActive: true } },
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
   * Create new document version
   */
  async createNewVersion(
    vehicleId: string,
    driverId: string,
    documentType: string,
    documentData: any,
  ): Promise<VehicleDocumentRecordDocument> {
    // Mark previous version as inactive
    const previousDocument = await this.findByVehicleIdAndType(vehicleId, documentType);
    if (previousDocument) {
      await this.findOneAndUpdate({ _id: previousDocument._id }, { isActive: false });
    }

    // Create new version
    return this.create({
      ...documentData,
      vehicleId,
      uploadedByDriverId: driverId,
      documentType,
      version: previousDocument ? previousDocument.version + 1 : 1,
      previousVersionId: previousDocument?._id,
      uploadedAt: new Date(),
    });
  }

  /**
   * Find documents needing expiry notification
   */
  async findDocumentsNeedingExpiryNotification(daysBeforeExpiry: number = 7): Promise<VehicleDocumentRecordDocument[]> {
    const notificationDate = new Date();
    notificationDate.setDate(notificationDate.getDate() + daysBeforeExpiry);

    return this.model
      .find({
        expiryDate: {
          $lte: notificationDate,
          $gte: new Date(),
        },
        status: 'verified',
        isActive: true,
        expiryNotificationSentAt: { $exists: false },
      })
      .populate('vehicleId', 'make model licensePlate')
      .populate('uploadedByDriverId', 'firstName lastName email phone fcmToken')
      .exec();
  }

  /**
   * Mark expiry notification as sent
   */
  async markExpiryNotificationSent(documentId: string): Promise<VehicleDocumentRecordDocument> {
    return this.findOneAndUpdate(
      { _id: documentId },
      {
        expiryNotificationSentAt: new Date(),
        isExpiringSoon: true,
      },
    );
  }

  /**
   * Set document as required
   */
  async setDocumentRequired(vehicleId: string, documentType: string, isRequired: boolean = true): Promise<void> {
    await this.model.updateMany({ vehicleId, documentType }, { isRequired }).exec();
  }

  /**
   * Find required documents for a vehicle
   */
  async findRequiredDocuments(vehicleId: string): Promise<VehicleDocumentRecordDocument[]> {
    return this.find({
      vehicleId,
      isRequired: true,
      isActive: true,
    });
  }

  /**
   * Get document statistics
   */
  async getDocumentStatistics(): Promise<any> {
    return this.model
      .aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            totalDocuments: { $sum: 1 },
            verifiedDocuments: {
              $sum: { $cond: [{ $eq: ['$status', 'verified'] }, 1, 0] },
            },
            pendingDocuments: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
            },
            rejectedDocuments: {
              $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] },
            },
            expiredDocuments: {
              $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] },
            },
            expiringDocuments: {
              $sum: { $cond: ['$isExpiringSoon', 1, 0] },
            },
            requiredDocuments: {
              $sum: { $cond: ['$isRequired', 1, 0] },
            },
          },
        },
      ])
      .exec();
  }

  /**
   * Find vehicles with incomplete documentation
   */
  async findVehiclesWithIncompleteDocumentation(): Promise<any> {
    const requiredDocuments = ['car_insurance', 'puspakom_inspection', 'taxi_permit_vehicle'];

    return this.model
      .aggregate([
        { $match: { isActive: true, status: 'verified' } },
        {
          $group: {
            _id: '$vehicleId',
            documentTypes: { $addToSet: '$documentType' },
            verifiedCount: { $sum: 1 },
          },
        },
        {
          $addFields: {
            hasAllRequired: {
              $setIsSubset: [requiredDocuments, '$documentTypes'],
            },
          },
        },
        {
          $match: {
            hasAllRequired: false,
          },
        },
      ])
      .exec();
  }

  /**
   * Find documents by vehicle and status
   */
  async findByVehicleIdAndStatus(vehicleId: string, status: string): Promise<VehicleDocumentRecordDocument[]> {
    return this.find({
      vehicleId,
      status,
      isActive: true,
    });
  }

  /**
   * Get document statistics by type
   */
  async getDocumentStatisticsByType(): Promise<any> {
    return this.model
      .aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: '$documentType',
            totalCount: { $sum: 1 },
            verifiedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'verified'] }, 1, 0] },
            },
            pendingCount: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
            },
            rejectedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] },
            },
            expiredCount: {
              $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] },
            },
          },
        },
        { $sort: { totalCount: -1 } },
      ])
      .exec();
  }
}
