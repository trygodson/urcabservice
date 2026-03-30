import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { DocumentType, DocumentStatus } from '@urcab-workspace/shared';
import { BankDetailsDto, DriverDocumentResponseDto } from './dto';
import { DriverDocumentRepository } from './repository/driveDocument.repository';

@Injectable()
export class BankDetailsDocumentService {
  private readonly logger = new Logger(BankDetailsDocumentService.name);

  constructor(private readonly driverDocumentRepository: DriverDocumentRepository) {}

  async uploadBankDetailsDocument(
    driverId: Types.ObjectId,
    bankDetails: BankDetailsDto,
  ): Promise<DriverDocumentResponseDto> {
    try {
      this.validateBankDetails(bankDetails);

      const documentData = {
        documentType: DocumentType.BANK_DETAILS,
        bankDetails,
        status: DocumentStatus.PENDING,
      };

      const savedDocument = await this.driverDocumentRepository.createDriverDocument(driverId, documentData);
      return this.mapToResponseDto(savedDocument);
    } catch (error) {
      this.logger.error(`Failed to upload bank details document for driver ${driverId}`, error.stack);
      throw new BadRequestException('Failed to upload bank details document');
    }
  }

  async updateBankDetailsDocument(
    documentId: string,
    driverId: Types.ObjectId,
    bankDetails: BankDetailsDto,
  ): Promise<DriverDocumentResponseDto> {
    try {
      this.validateBankDetails(bankDetails);

      const documentObjectId = new Types.ObjectId(documentId);
      const existingDocument = await this.driverDocumentRepository.getDriverDocumentById(documentObjectId);

      if (!existingDocument || existingDocument.documentType !== DocumentType.BANK_DETAILS) {
        throw new BadRequestException('Bank details document not found');
      }

      if (existingDocument.driverId.toString() !== driverId.toString()) {
        throw new BadRequestException('Document does not belong to this driver');
      }

      if (existingDocument.status === DocumentStatus.VERIFIED) {
        throw new BadRequestException('Cannot update verified bank details document. Please upload a new version.');
      }

      const updateData = {
        bankDetails,
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
      this.logger.error(`Failed to update bank details document ${documentId}`, error.stack);
      throw new BadRequestException('Failed to update bank details document');
    }
  }

  async getBankDetailsDocument(driverId: Types.ObjectId): Promise<any> {
    try {
      const document = await this.driverDocumentRepository.getDriverDocumentByType(driverId, DocumentType.BANK_DETAILS);
      return document ? { success: true, data: this.mapToResponseDto(document) } : { success: true, data: null };
    } catch (error) {
      this.logger.error(`Failed to get bank details document for driver ${driverId}`, error.stack);
      throw new BadRequestException('Failed to get bank details document');
    }
  }

  private validateBankDetails(bankDetails: BankDetailsDto): void {
    if (!bankDetails.bankBookImageUrl) {
      throw new BadRequestException('Bank book image is required');
    }

    if (!bankDetails.accountHolderName || bankDetails.accountHolderName.trim().length === 0) {
      throw new BadRequestException('Account holder name is required');
    }

    if (!bankDetails.accountNumber || bankDetails.accountNumber.trim().length === 0) {
      throw new BadRequestException('Account number is required');
    }

    if (!bankDetails.bankName || bankDetails.bankName.trim().length === 0) {
      throw new BadRequestException('Bank name is required');
    }
  }

  private mapToResponseDto(document: any): DriverDocumentResponseDto {
    return {
      _id: document._id.toString(),
      driverId: document.driverId.toString(),
      documentType: document.documentType,
      status: document.status,
      bankDetails: document.bankDetails,
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
