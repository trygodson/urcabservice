import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { PassengerDocumentRepository } from './repository/passenger-document.repository';
import {
  DocumentStatus,
  DocumentType,
  DriverDocumentDocument,
  PassengerDocument,
  PassengerDocumentDocument,
} from '@urcab-workspace/shared';
import { NRICDetailsPassengerDto, PassengerDocumentResponseDto } from './dto';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class NRICVerificationService {
  constructor(
    @InjectModel(PassengerDocument.name) private readonly passengerDocumentRepository: Model<PassengerDocumentDocument>,
  ) {}

  async uploadNRICDocument(userId: Types.ObjectId, nricDetails: NRICDetailsPassengerDto) {
    const existingDocument = await this.passengerDocumentRepository.findOne({
      passengerId: userId,
      documentType: DocumentType.NRIC,
      isActive: true,
    });

    if (existingDocument && existingDocument.status !== DocumentStatus.REJECTED) {
      throw new BadRequestException('NRIC document already exists');
    }

    const document = await this.passengerDocumentRepository.create({
      _id: new Types.ObjectId(),
      passengerId: userId,
      documentType: DocumentType.NRIC,
      status: DocumentStatus.PENDING,
      nricDetails,
      uploadedAt: new Date(),
      version: existingDocument ? existingDocument.version + 1 : 1,
      previousVersionId: existingDocument ? existingDocument._id : undefined,
    });

    if (existingDocument) {
      await this.passengerDocumentRepository.updateOne({ _id: existingDocument._id }, { isActive: false });
    }

    return {
      success: true,
      data: this.mapToResponseDto(document),
    };
  }

  async getNRICDocument(userId: Types.ObjectId) {
    const document = await this.passengerDocumentRepository.findOne({
      passengerId: userId,
      documentType: DocumentType.NRIC,
      isActive: true,
    });

    return document ? { success: true, data: this.mapToResponseDto(document) } : { success: true, data: null };
  }

  async updateNRICDocument(documentId: string, userId: Types.ObjectId, nricDetails: NRICDetailsPassengerDto) {
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
        nricDetails,
        status: DocumentStatus.PENDING,
        lastUpdatedAt: new Date(),
      },
      { new: true },
    );

    return {
      success: true,
      data: this.mapToResponseDto(updatedDocument),
    };
  }

  private mapToResponseDto(document: any): PassengerDocumentResponseDto {
    return {
      _id: document._id.toString(),
      passengerId: document.passengerId.toString(),
      documentType: document.documentType,
      status: document.status,
      nricDetails: document.nricDetails
        ? {
            nricName: document.nricDetails.nricName,
            nricAddress: document.nricDetails.nricAddress,
            nricNumber: document.nricDetails.nricNumber,
            citizenship: document.nricDetails.citizenship,
            frontImageUrl: document.nricDetails.frontImageUrl,
            backImageUrl: document.nricDetails.backImageUrl,
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
