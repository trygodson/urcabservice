import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { DocumentType, DocumentStatus } from '@urcab-workspace/shared';
import { DrivingLicenseDetailsDto, DriverDocumentResponseDto } from './dto';
import { DriverDocumentRepository } from './repository/driveDocument.repository';

@Injectable()
export class DrivingLicenseDocumentService {
  private readonly logger = new Logger(DrivingLicenseDocumentService.name);

  constructor(private readonly driverDocumentRepository: DriverDocumentRepository) {}

  async uploadDrivingLicenseDocument(
    driverId: Types.ObjectId,
    drivingLicenseDetails: DrivingLicenseDetailsDto,
  ): Promise<DriverDocumentResponseDto> {
    try {
      this.validateDrivingLicenseDetails(drivingLicenseDetails);

      const expiryDate = new Date(drivingLicenseDetails.expiryDate);
      const documentData = {
        documentType: DocumentType.DRIVING_LICENSE,
        drivingLicenseDetails: {
          ...drivingLicenseDetails,
          expiryDate,
        },
        expiryDate,
        status: DocumentStatus.PENDING,
      };

      const savedDocument = await this.driverDocumentRepository.createDriverDocument(driverId, documentData);
      return this.mapToResponseDto(savedDocument);
    } catch (error) {
      this.logger.error(`Failed to upload driving license document for driver ${driverId}`, error.stack);
      throw new BadRequestException('Failed to upload driving license document');
    }
  }

  async updateDrivingLicenseDocument(
    documentId: string,
    driverId: Types.ObjectId,
    drivingLicenseDetails: DrivingLicenseDetailsDto,
  ): Promise<DriverDocumentResponseDto> {
    try {
      this.validateDrivingLicenseDetails(drivingLicenseDetails);

      const documentObjectId = new Types.ObjectId(documentId);
      const existingDocument = await this.driverDocumentRepository.getDriverDocumentById(documentObjectId);

      if (!existingDocument || existingDocument.documentType !== DocumentType.DRIVING_LICENSE) {
        throw new BadRequestException('Driving license document not found');
      }

      if (existingDocument.driverId.toString() !== driverId.toString()) {
        throw new BadRequestException('Document does not belong to this driver');
      }

      if (existingDocument.status === DocumentStatus.VERIFIED) {
        throw new BadRequestException('Cannot update verified driving license document. Please upload a new version.');
      }

      const expiryDate = new Date(drivingLicenseDetails.expiryDate);
      const updateData = {
        drivingLicenseDetails: {
          ...drivingLicenseDetails,
          expiryDate,
        },
        expiryDate,
        status: DocumentStatus.PENDING,
        verifiedAt: undefined,
        verifiedByAdminId: undefined,
        verificationNotes: undefined,
        rejectionReason: undefined,
        rejectedAt: undefined,
      };

      const updatedDocument = await this.driverDocumentRepository.updateDriverDocument(documentObjectId, updateData);
      return this.mapToResponseDto(updatedDocument!);
    } catch (error) {
      this.logger.error(`Failed to update driving license document ${documentId}`, error.stack);
      throw new BadRequestException('Failed to update driving license document');
    }
  }

  async getDrivingLicenseDocument(driverId: Types.ObjectId): Promise<any> {
    try {
      const document = await this.driverDocumentRepository.getDriverDocumentByType(
        driverId,
        DocumentType.DRIVING_LICENSE,
      );
      return document ? { data: this.mapToResponseDto(document), success: true } : { data: null, success: true };
    } catch (error) {
      this.logger.error(`Failed to get driving license document for driver ${driverId}`, error.stack);
      throw new BadRequestException('Failed to get driving license document');
    }
  }

  private validateDrivingLicenseDetails(drivingLicenseDetails: DrivingLicenseDetailsDto): void {
    if (!drivingLicenseDetails.licenseNumber || drivingLicenseDetails.licenseNumber.trim().length === 0) {
      throw new BadRequestException('License number is required');
    }

    if (!drivingLicenseDetails.licenseClass) {
      throw new BadRequestException('License class is required');
    }

    if (!drivingLicenseDetails.licenseType) {
      throw new BadRequestException('License type is required');
    }

    if (!drivingLicenseDetails.expiryDate) {
      throw new BadRequestException('License expiry date is required');
    }

    const expiryDate = new Date(drivingLicenseDetails.expiryDate);
    if (expiryDate <= new Date()) {
      throw new BadRequestException('License expiry date must be in the future');
    }

    if (!drivingLicenseDetails.frontImageUrl || !drivingLicenseDetails.backImageUrl) {
      throw new BadRequestException('Both front and back images of driving license are required');
    }
  }

  private mapToResponseDto(document: any): DriverDocumentResponseDto {
    return {
      _id: document._id.toString(),
      driverId: document.driverId.toString(),
      documentType: document.documentType,
      status: document.status,
      drivingLicenseDetails: document.drivingLicenseDetails,
      expiryDate: document.expiryDate,
      verifiedByAdminId: document.verifiedByAdminId?.toString(),
      verifiedAt: document.verifiedAt,
      verificationNotes: document.verificationNotes,
      rejectionReason: document.rejectionReason,
      rejectedAt: document.rejectedAt,
      isActive: document.isActive,
      uploadedAt: document.uploadedAt,
      adminNotes: document.adminNotes,
      version: document.version,
      previousVersionId: document.previousVersionId?.toString(),
      isExpiringSoon: document.isExpiringSoon,
      expiryNotificationSentAt: document.expiryNotificationSentAt,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }
}
