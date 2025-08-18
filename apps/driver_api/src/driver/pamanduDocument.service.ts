import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { DocumentType, DocumentStatus } from '@urcab-workspace/shared';
import { PamanduDetailsDto, DriverDocumentResponseDto } from './dto';
import { DriverDocumentRepository } from './repository/driveDocument.repository';

@Injectable()
export class PamanduDocumentService {
  private readonly logger = new Logger(PamanduDocumentService.name);

  constructor(private readonly driverDocumentRepository: DriverDocumentRepository) {}

  async uploadPamanduDocument(
    driverId: Types.ObjectId,
    pamanduDetails: PamanduDetailsDto,
  ): Promise<DriverDocumentResponseDto> {
    try {
      this.validatePamanduDetails(pamanduDetails);

      const expiryDate = new Date(pamanduDetails.expiryDate);
      const documentData = {
        documentType: DocumentType.PAMANDU,
        pamanduDetails: {
          ...pamanduDetails,
          expiryDate,
        },
        expiryDate,
        status: DocumentStatus.PENDING,
      };

      const savedDocument = await this.driverDocumentRepository.createDriverDocument(driverId, documentData);
      return this.mapToResponseDto(savedDocument);
    } catch (error) {
      this.logger.error(`Failed to upload Pamandu document for driver ${driverId}`, error.stack);
      throw new BadRequestException('Failed to upload Pamandu document');
    }
  }

  async updatePamanduDocument(
    documentId: string,
    driverId: Types.ObjectId,
    pamanduDetails: PamanduDetailsDto,
  ): Promise<DriverDocumentResponseDto> {
    try {
      this.validatePamanduDetails(pamanduDetails);

      const documentObjectId = new Types.ObjectId(documentId);
      const existingDocument = await this.driverDocumentRepository.getDriverDocumentById(documentObjectId);

      if (!existingDocument || existingDocument.documentType !== DocumentType.PAMANDU) {
        throw new BadRequestException('Pamandu document not found');
      }

      if (existingDocument.driverId.toString() !== driverId.toString()) {
        throw new BadRequestException('Document does not belong to this driver');
      }

      if (existingDocument.status === DocumentStatus.VERIFIED) {
        throw new BadRequestException('Cannot update verified Pamandu document. Please upload a new version.');
      }

      const expiryDate = new Date(pamanduDetails.expiryDate);
      const updateData = {
        pamanduDetails: {
          ...pamanduDetails,
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
      this.logger.error(`Failed to update Pamandu document ${documentId}`, error.stack);
      throw new BadRequestException('Failed to update Pamandu document');
    }
  }

  async getPamanduDocument(driverId: Types.ObjectId): Promise<DriverDocumentResponseDto | null> {
    try {
      const document = await this.driverDocumentRepository.getDriverDocumentByType(driverId, DocumentType.PAMANDU);
      return document ? this.mapToResponseDto(document) : null;
    } catch (error) {
      this.logger.error(`Failed to get Pamandu document for driver ${driverId}`, error.stack);
      throw new BadRequestException('Failed to get Pamandu document');
    }
  }

  private validatePamanduDetails(pamanduDetails: PamanduDetailsDto): void {
    if (!pamanduDetails.imageUrl) {
      throw new BadRequestException('Pamandu certificate image is required');
    }

    if (!pamanduDetails.expiryDate) {
      throw new BadRequestException('Pamandu certificate expiry date is required');
    }

    const expiryDate = new Date(pamanduDetails.expiryDate);
    if (expiryDate <= new Date()) {
      throw new BadRequestException('Pamandu certificate must not be expired');
    }
  }

  private mapToResponseDto(document: any): DriverDocumentResponseDto {
    return {
      _id: document._id.toString(),
      driverId: document.driverId.toString(),
      documentType: document.documentType,
      status: document.status,
      pamanduDetails: document.pamanduDetails
        ? {
            ...document.pamanduDetails,
            expiryDate: document.pamanduDetails.expiryDate?.toISOString(),
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
