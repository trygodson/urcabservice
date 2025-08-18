import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractRepository } from '../database';
import { DriverDocument, DriverDocumentDocument } from '../models';

@Injectable()
export class DriverDocumentRepository extends AbstractRepository<DriverDocumentDocument> {
  protected readonly logger = new Logger(DriverDocumentRepository.name);

  constructor(@InjectModel(DriverDocument.name) driverDocumentModel: Model<DriverDocumentDocument>) {
    super(driverDocumentModel);
  }

  /**
   * Find all documents for a driver
   */
  async findByDriverId(driverId: string): Promise<DriverDocumentDocument[]> {
    return this.find({ driverId, isActive: true });
  }

  /**
   * Find document by type for a driver
   */
  async findByDriverIdAndType(driverId: string, documentType: string): Promise<DriverDocumentDocument | null> {
    return this.findOne({ driverId, documentType, isActive: true });
  }

  /**
   * Find documents by status
   */
  async findByStatus(status: string): Promise<DriverDocumentDocument[]> {
    return this.find({ status, isActive: true });
  }

  /**
   * Find pending verification documents
   */
  async findPendingVerification(): Promise<DriverDocumentDocument[]> {
    return this.model
      .find({ status: 'pending', isActive: true })
      .sort({ createdAt: -1 })
      .populate('driverId', 'firstName lastName email phone')
      .exec();
  }

  /**
   * Find documents expiring soon
   */
  async findExpiringDocuments(daysFromNow: number = 30): Promise<DriverDocumentDocument[]> {
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
      .populate('driverId', 'firstName lastName email phone fcmToken')
      .exec();
  }

  /**
   * Find expired documents
   */
  async findExpiredDocuments(): Promise<DriverDocumentDocument[]> {
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
  ): Promise<DriverDocumentDocument> {
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
  async rejectDocument(documentId: string, rejectionReason: string): Promise<DriverDocumentDocument> {
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
   * Check if driver has all required documents verified
   */
  async hasAllRequiredDocuments(driverId: string): Promise<boolean> {
    const requiredDocuments = ['nric', 'driving_license', 'psv_license', 'pamandu'];

    for (const docType of requiredDocuments) {
      const document = await this.findByDriverIdAndType(driverId, docType);
      if (!document || document.status !== 'verified') {
        return false;
      }
    }
    return true;
  }

  /**
   * Get missing required documents for a driver
   */
  async getMissingRequiredDocuments(driverId: string): Promise<string[]> {
    const requiredDocuments = ['nric', 'driving_license', 'psv_license', 'pamandu'];

    const missingDocuments: string[] = [];

    for (const docType of requiredDocuments) {
      const document = await this.findByDriverIdAndType(driverId, docType);
      if (!document || document.status !== 'verified') {
        missingDocuments.push(docType);
      }
    }

    return missingDocuments;
  }

  /**
   * Get driver verification status
   */
  async getDriverVerificationStatus(driverId: string): Promise<any> {
    const documents = await this.findByDriverId(driverId);

    const status = {
      totalDocuments: documents.length,
      verifiedDocuments: documents.filter((doc) => doc.status === 'verified').length,
      pendingDocuments: documents.filter((doc) => doc.status === 'pending').length,
      rejectedDocuments: documents.filter((doc) => doc.status === 'rejected').length,
      expiredDocuments: documents.filter((doc) => doc.status === 'expired').length,
      isFullyVerified: false,
      missingDocuments: [] as string[],
    };

    status.missingDocuments = await this.getMissingRequiredDocuments(driverId);
    status.isFullyVerified = status.missingDocuments.length === 0;

    return status;
  }

  /**
   * Find documents by type
   */
  async findByDocumentType(documentType: string): Promise<DriverDocumentDocument[]> {
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
  async createNewVersion(driverId: string, documentType: string, documentData: any): Promise<DriverDocumentDocument> {
    // Mark previous version as inactive
    const previousDocument = await this.findByDriverIdAndType(driverId, documentType);
    if (previousDocument) {
      await this.findOneAndUpdate({ _id: previousDocument._id }, { isActive: false });
    }

    // Create new version
    return this.create({
      ...documentData,
      driverId,
      documentType,
      version: previousDocument ? previousDocument.version + 1 : 1,
      previousVersionId: previousDocument?._id,
      uploadedAt: new Date(),
    });
  }

  /**
   * Find documents needing expiry notification
   */
  async findDocumentsNeedingExpiryNotification(daysBeforeExpiry: number = 7): Promise<DriverDocumentDocument[]> {
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
      .populate('driverId', 'firstName lastName email phone fcmToken')
      .exec();
  }

  /**
   * Mark expiry notification as sent
   */
  async markExpiryNotificationSent(documentId: string): Promise<DriverDocumentDocument> {
    return this.findOneAndUpdate(
      { _id: documentId },
      {
        expiryNotificationSentAt: new Date(),
        isExpiringSoon: true,
      },
    );
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
          },
        },
      ])
      .exec();
  }

  /**
   * Find drivers with incomplete documentation
   */
  async findDriversWithIncompleteDocumentation(): Promise<any> {
    // This would need to be implemented based on business logic
    // for what constitutes "complete" documentation
    const requiredDocuments = ['nric', 'driving_license', 'psv_license', 'pamandu'];

    return this.model
      .aggregate([
        { $match: { isActive: true, status: 'verified' } },
        {
          $group: {
            _id: '$driverId',
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
}
