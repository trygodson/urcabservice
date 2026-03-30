import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { DocumentStatus, DocumentType, PassengerDocument, PassengerDocumentDocument } from '@urcab-workspace/shared';
import { BankDetailsPassengerDto, PassengerDocumentResponseDto } from './dto';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class BankDetailsVerificationService {
  constructor(
    @InjectModel(PassengerDocument.name) private readonly passengerDocumentRepository: Model<PassengerDocumentDocument>,
  ) {}

  async uploadBankDetails(userId: Types.ObjectId, bankDetails: BankDetailsPassengerDto) {
    const existingDocument = await this.passengerDocumentRepository.findOne({
      passengerId: userId,
      documentType: DocumentType.BANK_DETAILS,
      isActive: true,
    });

    if (existingDocument && existingDocument.status !== DocumentStatus.REJECTED) {
      throw new BadRequestException('Bank details document already exists');
    }

    const document = await this.passengerDocumentRepository.create({
      _id: new Types.ObjectId(),
      passengerId: userId,
      documentType: DocumentType.BANK_DETAILS,
      status: DocumentStatus.PENDING,
      bankDetails,
      uploadedAt: new Date(),
      version: existingDocument ? existingDocument.version + 1 : 1,
      previousVersionId: existingDocument ? existingDocument._id : undefined,
    });

    if (existingDocument) {
      await this.passengerDocumentRepository.updateOne({ _id: existingDocument._id }, { isActive: false });
    }

    return { success: true, data: this.mapToResponseDto(document) };
  }

  async getBankDetails(userId: Types.ObjectId) {
    const document = await this.passengerDocumentRepository.findOne({
      passengerId: userId,
      documentType: DocumentType.BANK_DETAILS,
      isActive: true,
    });

    return document ? { success: true, data: this.mapToResponseDto(document) } : { success: true, data: null };
  }

  async updateBankDetails(documentId: string, userId: Types.ObjectId, bankDetails: BankDetailsPassengerDto) {
    const document = await this.passengerDocumentRepository.findOne({
      _id: new Types.ObjectId(documentId),
      passengerId: userId,
      isActive: true,
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.status === DocumentStatus.VERIFIED) {
      throw new BadRequestException('Cannot update verified document');
    }

    const updatedDocument = await this.passengerDocumentRepository.findOneAndUpdate(
      { _id: document._id },
      { bankDetails, status: DocumentStatus.PENDING, lastUpdatedAt: new Date() },
      { new: true },
    );

    return { success: true, data: this.mapToResponseDto(updatedDocument) };
  }

  private mapToResponseDto(document: any): PassengerDocumentResponseDto {
    return {
      _id: document._id.toString(),
      passengerId: document.passengerId.toString(),
      documentType: document.documentType,
      status: document.status,
      bankDetails: document.bankDetails
        ? {
            bankBookImageUrl: document.bankDetails.bankBookImageUrl,
            accountHolderName: document.bankDetails.accountHolderName,
            accountNumber: document.bankDetails.accountNumber,
            bankName: document.bankDetails.bankName,
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
      createdAt: document?.createdAt,
      updatedAt: document?.updatedAt,
    };
  }
}
