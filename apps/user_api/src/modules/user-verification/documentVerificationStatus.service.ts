import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { PassengerDocumentRepository } from './repository/passenger-document.repository';
import { DocumentStatus, DocumentType, PassengerDocument } from '@urcab-workspace/shared';
import { UserDocumentsSummaryDto } from './dto';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class DocumentVerificationStatusService {
  constructor(
    @InjectModel(PassengerDocument.name) private readonly passengerDocumentRepository: PassengerDocumentRepository,
  ) {}

  async getVerificationStatus(userId: Types.ObjectId): Promise<UserDocumentsSummaryDto> {
    const documents = await this.passengerDocumentRepository.find({
      driverId: userId,
      isActive: true,
    });

    const summary: UserDocumentsSummaryDto = {
      userId: userId.toString(),
      isFullyVerified: false,
      documentsStatus: {
        total: 0,
        pending: 0,
        verified: 0,
        rejected: 0,
      },
      documents: {
        nric: this.getDocumentStatus(documents, DocumentType.NRIC),
        passport: this.getDocumentStatus(documents, DocumentType.PASSPORT),
      },
      expiringDocuments: documents
        .filter((doc) => doc.isExpiringSoon)
        .map((doc) => ({
          documentType: doc.documentType,
          expiryDate: doc.expiryDate,
        })),
      lastUpdated: new Date(),
    };

    // Calculate totals
    summary.documentsStatus.total = documents.length;
    summary.documentsStatus.pending = documents.filter((doc) => doc.status === DocumentStatus.PENDING).length;
    summary.documentsStatus.verified = documents.filter((doc) => doc.status === DocumentStatus.VERIFIED).length;
    summary.documentsStatus.rejected = documents.filter((doc) => doc.status === DocumentStatus.REJECTED).length;

    // Check if fully verified
    const requiredDocuments = [DocumentType.NRIC];
    summary.isFullyVerified = requiredDocuments.every((docType) =>
      documents.some((doc) => doc.documentType === docType && doc.status === DocumentStatus.VERIFIED),
    );

    return summary;
  }

  private getDocumentStatus(documents: any[], documentType: DocumentType) {
    const document = documents.find((doc) => doc.documentType === documentType);
    if (!document) {
      return {
        exists: false,
        status: null,
        uploadedAt: null,
        verifiedAt: null,
        isExpiringSoon: false,
        expiryDate: null,
      };
    }

    return {
      exists: true,
      status: document.status,
      uploadedAt: document.uploadedAt,
      verifiedAt: document.verifiedAt,
      isExpiringSoon: document.isExpiringSoon,
      expiryDate: document.expiryDate,
    };
  }
}
