import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { DocumentType, DocumentStatus } from '@urcab-workspace/shared';
import { NRICDetailsDto, DriverDocumentResponseDto } from './dto';
import { DriverDocumentRepository } from './repository/driveDocument.repository';

@Injectable()
export class NRICDocumentService {
  private readonly logger = new Logger(NRICDocumentService.name);

  constructor(private readonly driverDocumentRepository: DriverDocumentRepository) {}

  async uploadNRICDocument(driverId: Types.ObjectId, nricDetails: NRICDetailsDto): Promise<DriverDocumentResponseDto> {
    try {
      this.validateNRICDetails(nricDetails);

      const documentData = {
        documentType: DocumentType.NRIC,
        nricDetails,
        status: DocumentStatus.PENDING,
      };

      const savedDocument = await this.driverDocumentRepository.createDriverDocument(driverId, documentData);
      return this.mapToResponseDto(savedDocument);
    } catch (error) {
      this.logger.error(`Failed to upload NRIC document for driver ${driverId}`, error.stack);
      throw new BadRequestException('Failed to upload NRIC document');
    }
  }

  async updateNRICDocument(
    documentId: string,
    driverId: Types.ObjectId,
    nricDetails: NRICDetailsDto,
  ): Promise<DriverDocumentResponseDto> {
    try {
      this.validateNRICDetails(nricDetails);

      const documentObjectId = new Types.ObjectId(documentId);
      const existingDocument = await this.driverDocumentRepository.getDriverDocumentById(documentObjectId);

      if (!existingDocument || existingDocument.documentType !== DocumentType.NRIC) {
        throw new BadRequestException('NRIC document not found');
      }

      if (existingDocument.driverId.toString() !== driverId.toString()) {
        throw new BadRequestException('Document does not belong to this driver');
      }

      if (existingDocument.status === DocumentStatus.VERIFIED) {
        throw new BadRequestException('Cannot update verified NRIC document. Please upload a new version.');
      }

      const updateData = {
        nricDetails,
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
      this.logger.error(`Failed to update NRIC document ${documentId}`, error.stack);
      throw new BadRequestException('Failed to update NRIC document');
    }
  }

  async getNRICDocument(driverId: Types.ObjectId): Promise<any> {
    try {
      const document = await this.driverDocumentRepository.getDriverDocumentByType(driverId, DocumentType.NRIC);
      return document ? { success: true, data: this.mapToResponseDto(document) } : { success: true, data: null };
    } catch (error) {
      this.logger.error(`Failed to get NRIC document for driver ${driverId}`, error.stack);
      throw new BadRequestException('Failed to get NRIC document');
    }
  }

  private validateNRICDetails(nricDetails: NRICDetailsDto): void {
    if (!nricDetails.nricNumber || nricDetails.nricNumber.length !== 12) {
      throw new BadRequestException('NRIC number must be exactly 12 characters');
    }

    if (!nricDetails.nricName || nricDetails.nricName.trim().length === 0) {
      throw new BadRequestException('NRIC name is required');
    }

    if (!nricDetails.nricAddress || nricDetails.nricAddress.trim().length === 0) {
      throw new BadRequestException('NRIC address is required');
    }

    if (!nricDetails.citizenship || nricDetails.citizenship.trim().length === 0) {
      throw new BadRequestException('Citizenship information is required');
    }

    if (!nricDetails.frontImageUrl || !nricDetails.backImageUrl) {
      throw new BadRequestException('Both front and back images of NRIC are required');
    }
  }

  private mapToResponseDto(document: any): DriverDocumentResponseDto {
    return {
      _id: document._id.toString(),
      driverId: document.driverId.toString(),
      documentType: document.documentType,
      status: document.status,
      nricDetails: document.nricDetails,
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
