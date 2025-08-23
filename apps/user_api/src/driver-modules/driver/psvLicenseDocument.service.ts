import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { DocumentType, DocumentStatus } from '@urcab-workspace/shared';
import { PSVLicenseDetailsDto, DriverDocumentResponseDto } from './dto';
import { DriverDocumentRepository } from './repository/driveDocument.repository';

@Injectable()
export class PSVLicenseDocumentService {
  private readonly logger = new Logger(PSVLicenseDocumentService.name);

  constructor(private readonly driverDocumentRepository: DriverDocumentRepository) {}

  async uploadPSVLicenseDocument(
    driverId: Types.ObjectId,
    psvLicenseDetails: PSVLicenseDetailsDto,
  ): Promise<DriverDocumentResponseDto> {
    try {
      this.validatePSVLicenseDetails(psvLicenseDetails);

      const psvExpiry = new Date(psvLicenseDetails.psvExpiry);
      const documentData = {
        documentType: DocumentType.PSV_LICENSE,
        psvLicenseDetails: {
          ...psvLicenseDetails,
          psvExpiry,
        },
        expiryDate: psvExpiry,
        status: DocumentStatus.PENDING,
      };

      const savedDocument = await this.driverDocumentRepository.createDriverDocument(driverId, documentData);
      return this.mapToResponseDto(savedDocument);
    } catch (error) {
      this.logger.error(`Failed to upload PSV license document for driver ${driverId}`, error.stack);
      throw new BadRequestException('Failed to upload PSV license document');
    }
  }

  async updatePSVLicenseDocument(
    documentId: string,
    driverId: Types.ObjectId,
    psvLicenseDetails: PSVLicenseDetailsDto,
  ): Promise<DriverDocumentResponseDto> {
    try {
      this.validatePSVLicenseDetails(psvLicenseDetails);

      const documentObjectId = new Types.ObjectId(documentId);
      const existingDocument = await this.driverDocumentRepository.getDriverDocumentById(documentObjectId);

      if (!existingDocument || existingDocument.documentType !== DocumentType.PSV_LICENSE) {
        throw new BadRequestException('PSV license document not found');
      }

      if (existingDocument.driverId.toString() !== driverId.toString()) {
        throw new BadRequestException('Document does not belong to this driver');
      }

      if (existingDocument.status === DocumentStatus.VERIFIED) {
        throw new BadRequestException('Cannot update verified PSV license document. Please upload a new version.');
      }

      const psvExpiry = new Date(psvLicenseDetails.psvExpiry);
      const updateData = {
        psvLicenseDetails: {
          ...psvLicenseDetails,
          psvExpiry,
        },
        expiryDate: psvExpiry,
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
      this.logger.error(`Failed to update PSV license document ${documentId}`, error.stack);
      throw new BadRequestException('Failed to update PSV license document');
    }
  }

  async getPSVLicenseDocument(driverId: Types.ObjectId): Promise<DriverDocumentResponseDto | null> {
    try {
      const document = await this.driverDocumentRepository.getDriverDocumentByType(driverId, DocumentType.PSV_LICENSE);
      return document ? this.mapToResponseDto(document) : null;
    } catch (error) {
      this.logger.error(`Failed to get PSV license document for driver ${driverId}`, error.stack);
      throw new BadRequestException('Failed to get PSV license document');
    }
  }

  private validatePSVLicenseDetails(psvLicenseDetails: PSVLicenseDetailsDto): void {
    if (!psvLicenseDetails.psvSerialNumber || psvLicenseDetails.psvSerialNumber.trim().length === 0) {
      throw new BadRequestException('PSV serial number is required');
    }

    if (psvLicenseDetails.ownPsv === undefined || psvLicenseDetails.ownPsv === null) {
      throw new BadRequestException('PSV ownership status is required');
    }

    if (!psvLicenseDetails.psvExpiry) {
      throw new BadRequestException('PSV expiry date is required');
    }

    const expiryDate = new Date(psvLicenseDetails.psvExpiry);
    if (expiryDate <= new Date()) {
      throw new BadRequestException('PSV expiry date must be in the future');
    }

    if (!psvLicenseDetails.frontImageUrl || !psvLicenseDetails.backImageUrl) {
      throw new BadRequestException('Both front and back images of PSV license are required');
    }
  }

  private mapToResponseDto(document: any): DriverDocumentResponseDto {
    return {
      _id: document._id.toString(),
      driverId: document.driverId.toString(),
      documentType: document.documentType,
      status: document.status,
      psvLicenseDetails: document.psvLicenseDetails
        ? {
            ...document.psvLicenseDetails,
            psvExpiry: document.psvLicenseDetails.psvExpiry?.toISOString(),
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
