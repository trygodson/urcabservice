import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { DocumentType, DocumentStatus } from '@urcab-workspace/shared';
import { TaxiPermitDriverDetailsDto, DriverDocumentResponseDto } from './dto';
import { DriverDocumentRepository } from './repository/driveDocument.repository';

@Injectable()
export class TaxiPermitDocumentService {
  private readonly logger = new Logger(TaxiPermitDocumentService.name);

  constructor(private readonly driverDocumentRepository: DriverDocumentRepository) {}

  async uploadTaxiPermitDocument(
    driverId: Types.ObjectId,
    taxiPermitDetails: TaxiPermitDriverDetailsDto,
  ): Promise<DriverDocumentResponseDto> {
    try {
      this.validateTaxiPermitDetails(taxiPermitDetails);

      const issueDate = new Date(taxiPermitDetails.issueDate);
      const expiryDate = new Date(taxiPermitDetails.expiryDate);

      const documentData = {
        documentType: DocumentType.TAXI_PERMIT_DRIVER,
        taxiPermitDriverDetails: {
          ...taxiPermitDetails,
          issueDate,
          expiryDate,
        },
        expiryDate,
        status: DocumentStatus.PENDING,
      };

      const savedDocument = await this.driverDocumentRepository.createDriverDocument(driverId, documentData);
      return this.mapToResponseDto(savedDocument);
    } catch (error) {
      this.logger.error(`Failed to upload taxi permit document for driver ${driverId}`, error.stack);
      throw new BadRequestException('Failed to upload taxi permit document');
    }
  }

  async updateTaxiPermitDocument(
    documentId: string,
    driverId: Types.ObjectId,
    taxiPermitDetails: TaxiPermitDriverDetailsDto,
  ): Promise<DriverDocumentResponseDto> {
    try {
      this.validateTaxiPermitDetails(taxiPermitDetails);

      const documentObjectId = new Types.ObjectId(documentId);
      const existingDocument = await this.driverDocumentRepository.getDriverDocumentById(documentObjectId);

      if (!existingDocument || existingDocument.documentType !== DocumentType.TAXI_PERMIT_DRIVER) {
        throw new BadRequestException('Taxi permit document not found');
      }

      if (existingDocument.driverId.toString() !== driverId.toString()) {
        throw new BadRequestException('Document does not belong to this driver');
      }

      if (existingDocument.status === DocumentStatus.VERIFIED) {
        throw new BadRequestException('Cannot update verified taxi permit document. Please upload a new version.');
      }

      const issueDate = new Date(taxiPermitDetails.issueDate);
      const expiryDate = new Date(taxiPermitDetails.expiryDate);

      const updateData = {
        taxiPermitDriverDetails: {
          ...taxiPermitDetails,
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
      this.logger.error(`Failed to update taxi permit document ${documentId}`, error.stack);
      throw new BadRequestException('Failed to update taxi permit document');
    }
  }

  async getTaxiPermitDocument(driverId: Types.ObjectId): Promise<DriverDocumentResponseDto | null> {
    try {
      const document = await this.driverDocumentRepository.getDriverDocumentByType(
        driverId,
        DocumentType.TAXI_PERMIT_DRIVER,
      );
      return document ? this.mapToResponseDto(document) : null;
    } catch (error) {
      this.logger.error(`Failed to get taxi permit document for driver ${driverId}`, error.stack);
      throw new BadRequestException('Failed to get taxi permit document');
    }
  }

  private validateTaxiPermitDetails(taxiPermitDetails: TaxiPermitDriverDetailsDto): void {
    if (!taxiPermitDetails.imageUrl) {
      throw new BadRequestException('Taxi permit image is required');
    }

    if (!taxiPermitDetails.issueDate) {
      throw new BadRequestException('Taxi permit issue date is required');
    }

    if (!taxiPermitDetails.expiryDate) {
      throw new BadRequestException('Taxi permit expiry date is required');
    }

    const issueDate = new Date(taxiPermitDetails.issueDate);
    const expiryDate = new Date(taxiPermitDetails.expiryDate);

    if (issueDate >= expiryDate) {
      throw new BadRequestException('Taxi permit issue date must be before expiry date');
    }

    if (expiryDate <= new Date()) {
      throw new BadRequestException('Taxi permit must not be expired');
    }
  }

  private mapToResponseDto(document: any): DriverDocumentResponseDto {
    return {
      _id: document._id.toString(),
      driverId: document.driverId.toString(),
      documentType: document.documentType,
      status: document.status,
      taxiPermitDriverDetails: document.taxiPermitDriverDetails
        ? {
            ...document.taxiPermitDriverDetails,
            issueDate: document.taxiPermitDriverDetails.issueDate?.toISOString(),
            expiryDate: document.taxiPermitDriverDetails.expiryDate?.toISOString(),
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
