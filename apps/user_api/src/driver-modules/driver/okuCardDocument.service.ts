import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { DocumentType, DocumentStatus } from '@urcab-workspace/shared';
import { OKUCardDetailsDto, DriverDocumentResponseDto } from './dto';
import { DriverDocumentRepository } from './repository/driveDocument.repository';

@Injectable()
export class OKUCardDocumentService {
  private readonly logger = new Logger(OKUCardDocumentService.name);

  constructor(private readonly driverDocumentRepository: DriverDocumentRepository) {}

  async uploadOKUCardDocument(
    driverId: Types.ObjectId,
    okuCardDetails: OKUCardDetailsDto,
  ): Promise<DriverDocumentResponseDto> {
    try {
      this.validateOKUCardDetails(okuCardDetails);

      const documentData = {
        documentType: DocumentType.OKU_CARD,
        okuCardDetails,
        status: DocumentStatus.PENDING,
      };

      const savedDocument = await this.driverDocumentRepository.createDriverDocument(driverId, documentData);
      return this.mapToResponseDto(savedDocument);
    } catch (error) {
      this.logger.error(`Failed to upload OKU card document for driver ${driverId}`, error.stack);
      throw new BadRequestException('Failed to upload OKU card document');
    }
  }

  async updateOKUCardDocument(
    documentId: string,
    driverId: Types.ObjectId,
    okuCardDetails: OKUCardDetailsDto,
  ): Promise<DriverDocumentResponseDto> {
    try {
      this.validateOKUCardDetails(okuCardDetails);

      const documentObjectId = new Types.ObjectId(documentId);
      const existingDocument = await this.driverDocumentRepository.getDriverDocumentById(documentObjectId);

      if (!existingDocument || existingDocument.documentType !== DocumentType.OKU_CARD) {
        throw new BadRequestException('OKU card document not found');
      }

      if (existingDocument.driverId.toString() !== driverId.toString()) {
        throw new BadRequestException('Document does not belong to this driver');
      }

      if (existingDocument.status === DocumentStatus.VERIFIED) {
        throw new BadRequestException('Cannot update verified OKU card document. Please upload a new version.');
      }

      const updateData = {
        okuCardDetails,
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
      this.logger.error(`Failed to update OKU card document ${documentId}`, error.stack);
      throw new BadRequestException('Failed to update OKU card document');
    }
  }

  async getOKUCardDocument(driverId: Types.ObjectId): Promise<any> {
    try {
      const document = await this.driverDocumentRepository.getDriverDocumentByType(driverId, DocumentType.OKU_CARD);
      return document ? { success: true, data: this.mapToResponseDto(document) } : { success: true, data: null };
    } catch (error) {
      this.logger.error(`Failed to get OKU card document for driver ${driverId}`, error.stack);
      throw new BadRequestException('Failed to get OKU card document');
    }
  }

  private validateOKUCardDetails(okuCardDetails: OKUCardDetailsDto): void {
    if (!okuCardDetails.frontImageUrl) {
      throw new BadRequestException('OKU card front image is required');
    }

    if (!okuCardDetails.disabilities || okuCardDetails.disabilities.length === 0) {
      throw new BadRequestException('At least one disability type is required');
    }

    if (!okuCardDetails.medicalLetterImageUrl) {
      throw new BadRequestException('Medical letter image is required');
    }
  }

  private mapToResponseDto(document: any): DriverDocumentResponseDto {
    return {
      _id: document._id.toString(),
      driverId: document.driverId.toString(),
      documentType: document.documentType,
      status: document.status,
      okuCardDetails: document.okuCardDetails,
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
