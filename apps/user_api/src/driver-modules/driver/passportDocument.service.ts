import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { DocumentType, DocumentStatus } from '@urcab-workspace/shared';
import { PassportDetailsDto, DriverDocumentResponseDto } from './dto';
import { DriverDocumentRepository } from './repository/driveDocument.repository';

@Injectable()
export class PassportDocumentService {
  private readonly logger = new Logger(PassportDocumentService.name);

  constructor(private readonly driverDocumentRepository: DriverDocumentRepository) {}

  async uploadPassportDocument(
    driverId: Types.ObjectId,
    passportDetails: PassportDetailsDto,
  ): Promise<DriverDocumentResponseDto> {
    try {
      this.validatePassportDetails(passportDetails);

      const issueDate = new Date(passportDetails.issueDate);
      const expiryDate = new Date(passportDetails.expiryDate);

      const documentData = {
        documentType: DocumentType.PASSPORT,
        passportDetails: {
          ...passportDetails,
          issueDate,
          expiryDate,
        },
        expiryDate,
        status: DocumentStatus.PENDING,
      };

      const savedDocument = await this.driverDocumentRepository.createDriverDocument(driverId, documentData);
      return this.mapToResponseDto(savedDocument);
    } catch (error) {
      this.logger.error(`Failed to upload passport document for driver ${driverId}`, error.stack);
      throw new BadRequestException('Failed to upload passport document');
    }
  }

  async updatePassportDocument(
    documentId: string,
    driverId: Types.ObjectId,
    passportDetails: PassportDetailsDto,
  ): Promise<DriverDocumentResponseDto> {
    try {
      this.validatePassportDetails(passportDetails);

      const documentObjectId = new Types.ObjectId(documentId);
      const existingDocument = await this.driverDocumentRepository.getDriverDocumentById(documentObjectId);

      if (!existingDocument || existingDocument.documentType !== DocumentType.PASSPORT) {
        throw new BadRequestException('Passport document not found');
      }

      if (existingDocument.driverId.toString() !== driverId.toString()) {
        throw new BadRequestException('Document does not belong to this driver');
      }

      if (existingDocument.status === DocumentStatus.VERIFIED) {
        throw new BadRequestException('Cannot update verified passport document. Please upload a new version.');
      }

      const issueDate = new Date(passportDetails.issueDate);
      const expiryDate = new Date(passportDetails.expiryDate);

      const updateData = {
        passportDetails: {
          ...passportDetails,
          issueDate,
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
      this.logger.error(`Failed to update passport document ${documentId}`, error.stack);
      throw new BadRequestException('Failed to update passport document');
    }
  }

  async getPassportDocument(driverId: Types.ObjectId): Promise<any> {
    try {
      const document = await this.driverDocumentRepository.getDriverDocumentByType(driverId, DocumentType.PASSPORT);

      // console.log(document, '=====document====');
      return document ? { success: true, data: this.mapToResponseDto(document) } : { success: true, data: null };
    } catch (error) {
      this.logger.error(`Failed to get passport document for driver ${driverId}`, error.stack);
      throw new BadRequestException('Failed to get passport document');
    }
  }

  private validatePassportDetails(passportDetails: PassportDetailsDto): void {
    if (!passportDetails.passportHolderName || passportDetails.passportHolderName.trim().length === 0) {
      throw new BadRequestException('Passport holder name is required');
    }

    if (!passportDetails.passportNumber || passportDetails.passportNumber.trim().length === 0) {
      throw new BadRequestException('Passport number is required');
    }

    if (!passportDetails.issueDate) {
      throw new BadRequestException('Passport issue date is required');
    }

    if (!passportDetails.expiryDate) {
      throw new BadRequestException('Passport expiry date is required');
    }

    const issueDate = new Date(passportDetails.issueDate);
    const expiryDate = new Date(passportDetails.expiryDate);

    if (issueDate >= expiryDate) {
      throw new BadRequestException('Passport issue date must be before expiry date');
    }

    if (expiryDate <= new Date()) {
      throw new BadRequestException('Passport must not be expired');
    }

    if (!passportDetails.imageUrl) {
      throw new BadRequestException('Passport image is required');
    }
  }

  private mapToResponseDto(document: any): DriverDocumentResponseDto {
    return {
      _id: document._id.toString(),
      driverId: document.driverId.toString(),
      documentType: document.documentType,
      status: document.status,
      passportDetails: document.passportDetails
        ? {
            ...document.passportDetails._doc,
            issueDate: document.passportDetails.issueDate?.toISOString(),
            expiryDate: document.passportDetails.expiryDate?.toISOString(),
          }
        : undefined,
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
