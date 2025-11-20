import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { DocumentType, DocumentStatus } from '@urcab-workspace/shared';
import { DocumentVerificationStatusDto, DriverDocumentsSummaryDto, DriverDocumentResponseDto } from './dto';
import { DriverDocumentRepository } from './repository/driveDocument.repository';

export interface DocumentRequirement {
  documentType: DocumentType;
  isRequired: boolean;
  displayName: string;
  description: string;
  hasExpiry: boolean;
}

export interface DetailedDocumentStatus {
  documentType: DocumentType;
  displayName: string;
  description: string;
  isRequired: boolean;
  isUploaded: boolean;
  status: string;
  uploadedAt?: Date;
  verifiedAt?: Date;
  rejectedAt?: Date;
  expiryDate?: Date;
  isExpiringSoon: boolean;
  daysToExpiry?: number;
  rejectionReason?: string;
  verificationNotes?: string;
  adminNotes?: string;
  version: number;
  nextSteps?: string[];
  canReupload: boolean;
  isBlocking: boolean; // Whether this document blocks driver verification
}

export interface ComplianceReport {
  driverId: string;
  overallComplianceStatus: 'compliant' | 'non_compliant' | 'pending' | 'incomplete';
  compliancePercentage: number;
  requiredDocuments: DetailedDocumentStatus[];
  optionalDocuments: DetailedDocumentStatus[];
  blockers: string[]; // List of issues preventing verification
  warnings: string[]; // List of warnings (expiring documents, etc.)
  recommendations: string[]; // List of recommended actions
  lastUpdated: Date;
  nextReviewDate?: Date;
}

@Injectable()
export class DocumentVerificationStatusService {
  private readonly logger = new Logger(DocumentVerificationStatusService.name);

  // Document requirements configuration
  private readonly DOCUMENT_REQUIREMENTS: DocumentRequirement[] = [
    {
      documentType: DocumentType.NRIC,
      isRequired: true,
      displayName: 'NRIC (National Registration Identity Card)',
      description: 'Malaysian identity card for citizens',
      hasExpiry: false,
    },
    {
      documentType: DocumentType.PASSPORT,
      isRequired: true,
      displayName: 'Passport',
      description: 'Valid passport for foreign nationals',
      hasExpiry: true,
    },
    {
      documentType: DocumentType.DRIVING_LICENSE,
      isRequired: true,
      displayName: 'Driving License',
      description: 'Valid Malaysian driving license',
      hasExpiry: true,
    },
    {
      documentType: DocumentType.PSV_LICENSE,
      isRequired: true,
      displayName: 'PSV License',
      description: 'Public Service Vehicle license',
      hasExpiry: true,
    },
    {
      documentType: DocumentType.PAMANDU,
      isRequired: true,
      displayName: 'Pamandu Certificate',
      description: 'Professional driving certification',
      hasExpiry: true,
    },
    {
      documentType: DocumentType.TAXI_PERMIT_DRIVER,
      isRequired: true,
      displayName: 'Taxi Permit (Driver)',
      description: 'Taxi driver permit for specific areas',
      hasExpiry: true,
    },
  ];

  constructor(private readonly driverDocumentRepository: DriverDocumentRepository) {}

  async getDocumentVerificationStatus(driverId: Types.ObjectId): Promise<DriverDocumentsSummaryDto> {
    try {
      const documents = await this.driverDocumentRepository.getAllDriverDocuments(driverId);

      const documentMap = new Map();
      documents.forEach((doc) => {
        documentMap.set(doc.documentType, doc);
      });
      // console.log(documentMap, 'documentMap');
      // console.log(documents);
      const documentStatuses: DocumentVerificationStatusDto[] = [];
      let verifiedCount = 0;
      let rejectedCount = 0;
      let expiringSoonCount = 0;

      // Process all document types
      this.DOCUMENT_REQUIREMENTS.forEach((requirement) => {
        const document = documentMap.get(requirement.documentType);

        const status: DocumentVerificationStatusDto = {
          documentType: requirement.documentType,
          isUploaded: !!document,
          status: document?.status || 'not_uploaded',
          expiryDate: document?.expiryDate,
          isExpiringSoon: document?.isExpiringSoon || false,
          rejectionReason: document?.rejectionReason,
          uploadedAt: document?.uploadedAt,
          verifiedAt: document?.verifiedAt,
        };

        documentStatuses.push(status);

        if (document) {
          if (document.status === DocumentStatus.VERIFIED) {
            verifiedCount++;
          } else if (document.status === DocumentStatus.REJECTED) {
            rejectedCount++;
          }

          if (document.isExpiringSoon) {
            expiringSoonCount++;
          }
        }
      });

      const requiredDocuments = this.DOCUMENT_REQUIREMENTS.filter((req) => req.isRequired);
      const uploadedRequiredCount = requiredDocuments.filter((req) => documentMap.has(req.documentType)).length;
      const verifiedRequiredCount = requiredDocuments.filter((req) => {
        const doc = documentMap.get(req.documentType);
        return doc && doc.status === DocumentStatus.VERIFIED;
      }).length;

      const hasCompleteDocumentation = verifiedRequiredCount === requiredDocuments.length;

      let overallStatus: 'pending' | 'verified' | 'rejected' | 'incomplete';
      if (hasCompleteDocumentation) {
        overallStatus = 'verified';
      } else if (rejectedCount > 0) {
        overallStatus = 'rejected';
      } else if (uploadedRequiredCount === requiredDocuments.length) {
        overallStatus = 'pending';
      } else {
        overallStatus = 'incomplete';
      }

      return {
        driverId: driverId.toString(),
        documents: documentStatuses,
        hasCompleteDocumentation,
        overallStatus,
        uploadedCount: documents.length,
        verifiedCount,
        rejectedCount,
        requiredCount: requiredDocuments.length,
        expiringSoonCount,
      };
    } catch (error) {
      this.logger.error(error, `Failed to get document verification status for driver ${driverId}`, error.stack);
      throw new BadRequestException('Failed to get document verification status');
    }
  }

  async getDetailedComplianceReport(driverId: Types.ObjectId): Promise<ComplianceReport> {
    try {
      const documents = await this.driverDocumentRepository.getAllDriverDocuments(driverId);

      const documentMap = new Map();
      documents.forEach((doc) => {
        documentMap.set(doc.documentType, doc);
      });

      const requiredDocuments: DetailedDocumentStatus[] = [];
      const optionalDocuments: DetailedDocumentStatus[] = [];
      const blockers: string[] = [];
      const warnings: string[] = [];
      const recommendations: string[] = [];

      let totalRequired = 0;
      let compliantRequired = 0;

      this.DOCUMENT_REQUIREMENTS.forEach((requirement) => {
        const document = documentMap.get(requirement.documentType);
        const isExpiringSoon = this.checkIfExpiringSoon(document?.expiryDate);
        const daysToExpiry = this.calculateDaysToExpiry(document?.expiryDate);

        const detailedStatus: DetailedDocumentStatus = {
          documentType: requirement.documentType,
          displayName: requirement.displayName,
          description: requirement.description,
          isRequired: requirement.isRequired,
          isUploaded: !!document,
          status: document?.status || 'not_uploaded',
          uploadedAt: document?.uploadedAt,
          verifiedAt: document?.verifiedAt,
          rejectedAt: document?.rejectedAt,
          expiryDate: document?.expiryDate,
          isExpiringSoon,
          daysToExpiry,
          rejectionReason: document?.rejectionReason,
          verificationNotes: document?.verificationNotes,
          adminNotes: document?.adminNotes,
          version: document?.version || 0,
          nextSteps: this.generateNextSteps(document, requirement),
          canReupload: this.canReuploadDocument(document),
          isBlocking: this.isDocumentBlocking(document, requirement),
        };

        if (requirement.isRequired) {
          requiredDocuments.push(detailedStatus);
          totalRequired++;

          if (document?.status === DocumentStatus.VERIFIED && !isExpiringSoon) {
            compliantRequired++;
          }

          // Check for blockers
          if (!document) {
            blockers.push(`${requirement.displayName} is required but not uploaded`);
          } else if (document.status === DocumentStatus.REJECTED) {
            blockers.push(
              `${requirement.displayName} was rejected: ${document.rejectionReason || 'No reason provided'}`,
            );
          } else if (document.status === DocumentStatus.PENDING) {
            warnings.push(`${requirement.displayName} is pending verification`);
          }

          // Check for expiry warnings
          if (document && document.expiryDate) {
            if (isExpiringSoon) {
              warnings.push(`${requirement.displayName} expires in ${daysToExpiry} days`);
              recommendations.push(`Renew ${requirement.displayName} before it expires`);
            } else if (document.expiryDate <= new Date()) {
              blockers.push(`${requirement.displayName} has expired`);
            }
          }
        } else {
          optionalDocuments.push(detailedStatus);

          // Optional document warnings
          if (document && document.expiryDate && isExpiringSoon) {
            warnings.push(`Optional ${requirement.displayName} expires in ${daysToExpiry} days`);
          }
        }
      });

      // Generate recommendations
      if (blockers.length === 0 && warnings.length === 0) {
        recommendations.push('All required documents are verified and up to date');
      } else {
        if (requiredDocuments.some((doc) => !doc.isUploaded)) {
          recommendations.push('Upload all required documents to complete verification');
        }
        if (requiredDocuments.some((doc) => doc.status === DocumentStatus.REJECTED)) {
          recommendations.push('Re-upload rejected documents with corrections');
        }
        if (requiredDocuments.some((doc) => doc.isExpiringSoon)) {
          recommendations.push('Renew expiring documents to maintain compliance');
        }
      }

      const compliancePercentage = totalRequired > 0 ? Math.round((compliantRequired / totalRequired) * 100) : 0;

      let overallComplianceStatus: 'compliant' | 'non_compliant' | 'pending' | 'incomplete';
      if (blockers.length > 0) {
        overallComplianceStatus = 'non_compliant';
      } else if (compliancePercentage === 100) {
        overallComplianceStatus = 'compliant';
      } else if (requiredDocuments.every((doc) => doc.isUploaded)) {
        overallComplianceStatus = 'pending';
      } else {
        overallComplianceStatus = 'incomplete';
      }

      return {
        driverId: driverId.toString(),
        overallComplianceStatus,
        compliancePercentage,
        requiredDocuments,
        optionalDocuments,
        blockers,
        warnings,
        recommendations,
        lastUpdated: new Date(),
        nextReviewDate: this.calculateNextReviewDate(documents),
      };
    } catch (error) {
      this.logger.error(`Failed to get detailed compliance report for driver ${driverId}`, error.stack);
      throw new BadRequestException('Failed to get compliance report');
    }
  }

  async getMissingDocuments(driverId: Types.ObjectId): Promise<DocumentRequirement[]> {
    try {
      const documents = await this.driverDocumentRepository.getAllDriverDocuments(driverId);
      const uploadedTypes = new Set(documents.map((doc) => doc.documentType));

      return this.DOCUMENT_REQUIREMENTS.filter(
        (requirement) => requirement.isRequired && !uploadedTypes.has(requirement.documentType),
      );
    } catch (error) {
      this.logger.error(`Failed to get missing documents for driver ${driverId}`, error.stack);
      throw new BadRequestException('Failed to get missing documents');
    }
  }

  async getRejectedDocuments(driverId: Types.ObjectId): Promise<DriverDocumentResponseDto[]> {
    try {
      const documents = await this.driverDocumentRepository.getAllDriverDocuments(driverId);
      const rejectedDocuments = documents.filter((doc) => doc.status === DocumentStatus.REJECTED);

      return rejectedDocuments.map((doc) => this.mapToResponseDto(doc));
    } catch (error) {
      this.logger.error(`Failed to get rejected documents for driver ${driverId}`, error.stack);
      throw new BadRequestException('Failed to get rejected documents');
    }
  }

  async getExpiringDocuments(driverId: Types.ObjectId, daysAhead: number = 30): Promise<DriverDocumentResponseDto[]> {
    try {
      const documents = await this.driverDocumentRepository.getAllDriverDocuments(driverId);
      const expiryThreshold = new Date();
      expiryThreshold.setDate(expiryThreshold.getDate() + daysAhead);

      const expiringDocuments = documents.filter(
        (doc) =>
          doc.expiryDate &&
          doc.expiryDate <= expiryThreshold &&
          doc.expiryDate > new Date() &&
          doc.status === DocumentStatus.VERIFIED,
      );

      return expiringDocuments.map((doc) => this.mapToResponseDto(doc));
    } catch (error) {
      this.logger.error(`Failed to get expiring documents for driver ${driverId}`, error.stack);
      throw new BadRequestException('Failed to get expiring documents');
    }
  }

  async getDocumentRequirements(): Promise<DocumentRequirement[]> {
    return this.DOCUMENT_REQUIREMENTS;
  }

  async isDriverFullyVerified(driverId: Types.ObjectId): Promise<{ isVerified: boolean; missingItems: string[] }> {
    try {
      const complianceReport = await this.getDetailedComplianceReport(driverId);

      const isVerified =
        complianceReport.overallComplianceStatus === 'compliant' && complianceReport.blockers.length === 0;

      const missingItems = [
        ...complianceReport.blockers,
        ...complianceReport.warnings.filter((warning) => warning.includes('required')),
      ];

      return { isVerified, missingItems };
    } catch (error) {
      this.logger.error(`Failed to check driver verification status for driver ${driverId}`, error.stack);
      throw new BadRequestException('Failed to check driver verification status');
    }
  }

  private checkIfExpiringSoon(expiryDate?: Date, daysAhead: number = 30): boolean {
    if (!expiryDate) return false;

    const threshold = new Date();
    threshold.setDate(threshold.getDate() + daysAhead);

    return expiryDate <= threshold && expiryDate > new Date();
  }

  private calculateDaysToExpiry(expiryDate?: Date): number | undefined {
    if (!expiryDate) return undefined;

    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  private generateNextSteps(document: any, requirement: DocumentRequirement): string[] {
    const steps: string[] = [];

    if (!document) {
      steps.push(`Upload your ${requirement.displayName}`);
      steps.push('Ensure all required information is clearly visible');
      if (requirement.hasExpiry) {
        steps.push('Make sure the document is not expired');
      }
    } else {
      switch (document.status) {
        case DocumentStatus.PENDING:
          steps.push('Wait for admin verification');
          steps.push('You will be notified once reviewed');
          break;
        case DocumentStatus.REJECTED:
          steps.push('Review the rejection reason');
          steps.push('Upload a corrected version');
          steps.push('Ensure all requirements are met');
          break;
        case DocumentStatus.VERIFIED:
          if (this.checkIfExpiringSoon(document.expiryDate)) {
            steps.push('Renew this document before it expires');
            steps.push('Upload the renewed document once available');
          } else {
            steps.push('Document is verified and valid');
          }
          break;
      }
    }

    return steps;
  }

  private canReuploadDocument(document: any): boolean {
    if (!document) return true;
    return document.status !== DocumentStatus.VERIFIED || this.checkIfExpiringSoon(document.expiryDate);
  }

  private isDocumentBlocking(document: any, requirement: DocumentRequirement): boolean {
    if (!requirement.isRequired) return false;

    if (!document) return true;

    if (document.status === DocumentStatus.REJECTED) return true;

    if (document.expiryDate && document.expiryDate <= new Date()) return true;

    return false;
  }

  private calculateNextReviewDate(documents: any[]): Date | undefined {
    const expiryDates = documents
      .filter((doc) => doc.expiryDate && doc.status === DocumentStatus.VERIFIED)
      .map((doc) => doc.expiryDate)
      .sort((a, b) => a.getTime() - b.getTime());

    if (expiryDates.length === 0) return undefined;

    // Schedule review 60 days before earliest expiry
    const earliestExpiry = expiryDates[0];
    const reviewDate = new Date(earliestExpiry);
    reviewDate.setDate(reviewDate.getDate() - 60);

    return reviewDate > new Date() ? reviewDate : undefined;
  }

  private mapToResponseDto(document: any): DriverDocumentResponseDto {
    return {
      _id: document._id.toString(),
      driverId: document.driverId.toString(),
      documentType: document.documentType,
      status: document.status,
      nricDetails: document.nricDetails,
      passportDetails: document.passportDetails
        ? {
            ...document.passportDetails,
            issueDate: document.passportDetails.issueDate?.toISOString(),
            expiryDate: document.passportDetails.expiryDate?.toISOString(),
          }
        : undefined,
      psvLicenseDetails: document.psvLicenseDetails
        ? {
            ...document.psvLicenseDetails,
            psvExpiry: document.psvLicenseDetails.psvExpiry?.toISOString(),
          }
        : undefined,
      pamanduDetails: document.pamanduDetails
        ? {
            ...document.pamanduDetails,
            expiryDate: document.pamanduDetails.expiryDate?.toISOString(),
          }
        : undefined,
      drivingLicenseDetails: document.drivingLicenseDetails
        ? {
            ...document.drivingLicenseDetails,
            expiryDate: document.drivingLicenseDetails.expiryDate?.toISOString(),
          }
        : undefined,
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
