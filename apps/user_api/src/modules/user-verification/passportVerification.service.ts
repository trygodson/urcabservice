import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { DocumentStatus, DocumentType, PassengerDocument, PassengerDocumentDocument } from '@urcab-workspace/shared';
import { PassengerDocumentResponseDto, PassportDetailsDto } from './dto';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class PassportVerificationService {
  constructor(
    @InjectModel(PassengerDocument.name) private readonly passengerDocumentRepository: Model<PassengerDocumentDocument>,
  ) {}

  async uploadPassportDocument(userId: Types.ObjectId, passportDetails: PassportDetailsDto) {
    const existingDocument = await this.passengerDocumentRepository.findOne({
      passengerId: userId,
      documentType: DocumentType.PASSPORT,
      isActive: true,
    });

    if (existingDocument && existingDocument.status !== DocumentStatus.REJECTED) {
      throw new BadRequestException('Passport document already exists');
    }

    const document = await this.passengerDocumentRepository.create({
      _id: new Types.ObjectId(),
      passengerId: userId,
      documentType: DocumentType.PASSPORT,
      status: DocumentStatus.PENDING,
      passportDetails,
      uploadedAt: new Date(),
      version: existingDocument ? existingDocument.version + 1 : 1,
      previousVersionId: existingDocument ? existingDocument._id : undefined,
      expiryDate: passportDetails.expiryDate,
      isExpiringSoon: this.isExpiringSoon(passportDetails.expiryDate),
    });

    if (existingDocument) {
      await this.passengerDocumentRepository.updateOne({ _id: existingDocument._id }, { isActive: false });
    }

    return document ? { success: true, data: this.mapToResponseDto(document) } : { success: true, data: null };
  }

  async getPassportDocument(userId: Types.ObjectId) {
    const document = await this.passengerDocumentRepository.findOne({
      passengerId: userId,
      documentType: DocumentType.PASSPORT,
      isActive: true,
    });

    return document ? { success: true, data: this.mapToResponseDto(document) } : { success: true, data: null };
  }

  async updatePassportDocument(documentId: string, userId: Types.ObjectId, passportDetails: PassportDetailsDto) {
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
      {
        passportDetails,
        status: DocumentStatus.PENDING,
        lastUpdatedAt: new Date(),
        expiryDate: passportDetails.expiryDate,
        isExpiringSoon: this.isExpiringSoon(passportDetails.expiryDate),
      },
      { new: true },
    );

    return document ? { success: true, data: this.mapToResponseDto(updatedDocument) } : { success: true, data: null };
  }

  private isExpiringSoon(expiryDate: Date): boolean {
    if (!expiryDate) return false;
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiryDate <= thirtyDaysFromNow;
  }

  private mapToResponseDto(document: any): PassengerDocumentResponseDto {
    return {
      _id: document._id.toString(),
      passengerId: document.passengerId.toString(),
      documentType: document.documentType,
      status: document.status,

      passportDetails: document.passportDetails
        ? {
            passportHolderName: document.passportDetails.passportHolderName,
            passportNumber: document.passportDetails.passportNumber,
            issueDate: document.passportDetails.issueDate?.toISOString(),
            expiryDate: document.passportDetails.expiryDate?.toISOString(),
            imageUrl: document.passportDetails.imageUrl,
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
