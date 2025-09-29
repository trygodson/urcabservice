import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { VehicleDocumentRepository } from './repository/vehicleDocument.repository';
import { VehicleRepository } from './repository/vehicle.repository';
import { VehicleDocumentType, VehicleDocumentStatus } from '@urcab-workspace/shared';
import {
  AuthorizationLetterDetailsDto,
  CarInsuranceDetailsDto,
  CarRentalAgreementDetailsDto,
  CreateVehicleDocumentDto,
  PuspakomInspectionDetailsDto,
  TaxiPermitVehicleDetailsDto,
  UpdateVehicleDocumentDto,
  VehicleDocumentResponseDto,
  VehicleDocumentsSummaryDto,
} from './dto';

@Injectable()
export class VehicleDocumentService {
  private readonly logger = new Logger(VehicleDocumentService.name);

  constructor(
    private readonly vehicleDocumentRepository: VehicleDocumentRepository,
    private readonly vehicleRepository: VehicleRepository,
  ) {}

  async uploadCarInsuranceDocument(
    vehicleId: string,
    driverId: Types.ObjectId,
    carInsuranceDetails: CarInsuranceDetailsDto,
  ): Promise<VehicleDocumentResponseDto> {
    try {
      const vehicleObjectId = new Types.ObjectId(vehicleId);
      await this.verifyVehicleOwnership(vehicleObjectId, driverId);

      const documentData: any = {
        documentType: VehicleDocumentType.CAR_INSURANCE,
        carInsuranceDetails: {
          ...carInsuranceDetails,
          insuranceExpiryDate: new Date(carInsuranceDetails.insuranceExpiryDate),
        },
        expiryDate: new Date(carInsuranceDetails.insuranceExpiryDate),
        isRequired: true,
      };

      const savedDocument = await this.vehicleDocumentRepository.createVehicleDocument(
        vehicleObjectId,
        driverId,
        documentData,
      );

      await this.updateVehicleDocumentationStatus(vehicleObjectId);
      return this.mapToResponseDto(savedDocument);
    } catch (error) {
      this.logger.error(`Failed to upload car insurance document for vehicle ${vehicleId}`, error.stack);
      throw error;
    }
  }

  async updateCarInsuranceDocument(
    documentId: string,
    driverId: Types.ObjectId,
    carInsuranceDetails: CarInsuranceDetailsDto,
  ): Promise<VehicleDocumentResponseDto> {
    try {
      const documentObjectId = new Types.ObjectId(documentId);
      const existingDocument = await this.vehicleDocumentRepository.getVehicleDocumentById(documentObjectId);

      if (!existingDocument) {
        throw new NotFoundException('Document not found');
      }

      if (existingDocument.uploadedByDriverId.toString() !== driverId.toString()) {
        throw new BadRequestException('Document does not belong to this driver');
      }

      if (existingDocument.documentType !== VehicleDocumentType.CAR_INSURANCE) {
        throw new BadRequestException('Document is not a car insurance document');
      }

      if (existingDocument.status === VehicleDocumentStatus.VERIFIED) {
        throw new BadRequestException('Cannot update verified document. Please upload a new version.');
      }

      const updateData = {
        carInsuranceDetails: {
          ...carInsuranceDetails,
          insuranceExpiryDate: new Date(carInsuranceDetails.insuranceExpiryDate),
        },
        expiryDate: new Date(carInsuranceDetails.insuranceExpiryDate),
        status: VehicleDocumentStatus.PENDING,
        verifiedAt: undefined,
        verifiedByAdminId: undefined,
        verificationNotes: undefined,
        rejectionReason: undefined,
        rejectedAt: undefined,
      };

      const updatedDocument = await this.vehicleDocumentRepository.updateVehicleDocument(documentObjectId, updateData);

      if (!updatedDocument) {
        throw new NotFoundException('Document not found');
      }

      await this.updateVehicleDocumentationStatus(existingDocument.vehicleId);
      return this.mapToResponseDto(updatedDocument);
    } catch (error) {
      this.logger.error(`Failed to update car insurance document ${documentId}`, error.stack);
      throw error;
    }
  }

  // ===== Car Rental Agreement Document Methods =====
  async uploadCarRentalAgreementDocument(
    vehicleId: string,
    driverId: Types.ObjectId,
    carRentalAgreementDetails: CarRentalAgreementDetailsDto,
  ): Promise<VehicleDocumentResponseDto> {
    try {
      const vehicleObjectId = new Types.ObjectId(vehicleId);
      await this.verifyVehicleOwnership(vehicleObjectId, driverId);

      const documentData: any = {
        documentType: VehicleDocumentType.CAR_RENTAL_AGREEMENT,
        carRentalAgreementDetails: {
          ...carRentalAgreementDetails,
          startDate: carRentalAgreementDetails.startDate ? new Date(carRentalAgreementDetails.startDate) : undefined,
          endDate: carRentalAgreementDetails.endDate ? new Date(carRentalAgreementDetails.endDate) : undefined,
        },
        expiryDate: carRentalAgreementDetails.endDate ? new Date(carRentalAgreementDetails.endDate) : undefined,
        isRequired: false,
      };

      const savedDocument = await this.vehicleDocumentRepository.createVehicleDocument(
        vehicleObjectId,
        driverId,
        documentData,
      );

      await this.updateVehicleDocumentationStatus(vehicleObjectId);
      return this.mapToResponseDto(savedDocument);
    } catch (error) {
      this.logger.error(`Failed to upload car rental agreement document for vehicle ${vehicleId}`, error.stack);
      throw error;
    }
  }

  async updateCarRentalAgreementDocument(
    documentId: string,
    driverId: Types.ObjectId,
    carRentalAgreementDetails: CarRentalAgreementDetailsDto,
  ): Promise<VehicleDocumentResponseDto> {
    try {
      const documentObjectId = new Types.ObjectId(documentId);
      const existingDocument = await this.vehicleDocumentRepository.getVehicleDocumentById(documentObjectId);

      if (!existingDocument || existingDocument.documentType !== VehicleDocumentType.CAR_RENTAL_AGREEMENT) {
        throw new NotFoundException('Car rental agreement document not found');
      }

      if (existingDocument.uploadedByDriverId.toString() !== driverId.toString()) {
        throw new BadRequestException('Document does not belong to this driver');
      }

      if (existingDocument.status === VehicleDocumentStatus.VERIFIED) {
        throw new BadRequestException('Cannot update verified document. Please upload a new version.');
      }

      const updateData = {
        carRentalAgreementDetails: {
          ...carRentalAgreementDetails,
          startDate: carRentalAgreementDetails.startDate ? new Date(carRentalAgreementDetails.startDate) : undefined,
          endDate: carRentalAgreementDetails.endDate ? new Date(carRentalAgreementDetails.endDate) : undefined,
        },
        expiryDate: carRentalAgreementDetails.endDate ? new Date(carRentalAgreementDetails.endDate) : undefined,
        status: VehicleDocumentStatus.PENDING,
      };

      const updatedDocument = await this.vehicleDocumentRepository.updateVehicleDocument(documentObjectId, updateData);
      await this.updateVehicleDocumentationStatus(existingDocument.vehicleId);
      return this.mapToResponseDto(updatedDocument!);
    } catch (error) {
      this.logger.error(`Failed to update car rental agreement document ${documentId}`, error.stack);
      throw error;
    }
  }

  // ===== Puspakom Inspection Document Methods =====
  async uploadPuspakomInspectionDocument(
    vehicleId: string,
    driverId: Types.ObjectId,
    puspakomInspectionDetails: PuspakomInspectionDetailsDto,
  ): Promise<VehicleDocumentResponseDto> {
    try {
      const vehicleObjectId = new Types.ObjectId(vehicleId);
      await this.verifyVehicleOwnership(vehicleObjectId, driverId);

      const documentData: any = {
        documentType: VehicleDocumentType.PUSPAKOM_INSPECTION,
        puspakomInspectionDetails: {
          ...puspakomInspectionDetails,
          inspectionDate: puspakomInspectionDetails.inspectionDate
            ? new Date(puspakomInspectionDetails.inspectionDate)
            : undefined,
          expiryDate: puspakomInspectionDetails.expiryDate ? new Date(puspakomInspectionDetails.expiryDate) : undefined,
        },
        expiryDate: puspakomInspectionDetails.expiryDate ? new Date(puspakomInspectionDetails.expiryDate) : undefined,
        isRequired: true,
      };

      const savedDocument = await this.vehicleDocumentRepository.createVehicleDocument(
        vehicleObjectId,
        driverId,
        documentData,
      );

      await this.updateVehicleDocumentationStatus(vehicleObjectId);
      return this.mapToResponseDto(savedDocument);
    } catch (error) {
      this.logger.error(`Failed to upload Puspakom inspection document for vehicle ${vehicleId}`, error.stack);
      throw error;
    }
  }

  async updatePuspakomInspectionDocument(
    documentId: string,
    driverId: Types.ObjectId,
    puspakomInspectionDetails: PuspakomInspectionDetailsDto,
  ): Promise<VehicleDocumentResponseDto> {
    try {
      const documentObjectId = new Types.ObjectId(documentId);
      const existingDocument = await this.vehicleDocumentRepository.getVehicleDocumentById(documentObjectId);

      if (!existingDocument || existingDocument.documentType !== VehicleDocumentType.PUSPAKOM_INSPECTION) {
        throw new NotFoundException('Puspakom inspection document not found');
      }

      if (existingDocument.uploadedByDriverId.toString() !== driverId.toString()) {
        throw new BadRequestException('Document does not belong to this driver');
      }

      if (existingDocument.status === VehicleDocumentStatus.VERIFIED) {
        throw new BadRequestException('Cannot update verified document. Please upload a new version.');
      }

      const updateData = {
        puspakomInspectionDetails: {
          ...puspakomInspectionDetails,
          inspectionDate: puspakomInspectionDetails.inspectionDate
            ? new Date(puspakomInspectionDetails.inspectionDate)
            : undefined,
          expiryDate: puspakomInspectionDetails.expiryDate ? new Date(puspakomInspectionDetails.expiryDate) : undefined,
        },
        expiryDate: puspakomInspectionDetails.expiryDate ? new Date(puspakomInspectionDetails.expiryDate) : undefined,
        status: VehicleDocumentStatus.PENDING,
      };

      const updatedDocument = await this.vehicleDocumentRepository.updateVehicleDocument(documentObjectId, updateData);
      await this.updateVehicleDocumentationStatus(existingDocument.vehicleId);
      return this.mapToResponseDto(updatedDocument!);
    } catch (error) {
      this.logger.error(`Failed to update Puspakom inspection document ${documentId}`, error.stack);
      throw error;
    }
  }

  // ===== Taxi Permit Document Methods =====
  async uploadTaxiPermitDocument(
    vehicleId: string,
    driverId: Types.ObjectId,
    taxiPermitVehicleDetails: TaxiPermitVehicleDetailsDto,
  ): Promise<VehicleDocumentResponseDto> {
    try {
      const vehicleObjectId = new Types.ObjectId(vehicleId);
      await this.verifyVehicleOwnership(vehicleObjectId, driverId);

      const documentData: any = {
        documentType: VehicleDocumentType.TAXI_PERMIT_VEHICLE,
        taxiPermitVehicleDetails: {
          ...taxiPermitVehicleDetails,
          issueDate: new Date(taxiPermitVehicleDetails.issueDate),
          expiryDate: new Date(taxiPermitVehicleDetails.expiryDate),
        },
        expiryDate: new Date(taxiPermitVehicleDetails.expiryDate),
        isRequired: true,
      };

      const savedDocument = await this.vehicleDocumentRepository.createVehicleDocument(
        vehicleObjectId,
        driverId,
        documentData,
      );

      await this.updateVehicleDocumentationStatus(vehicleObjectId);
      return this.mapToResponseDto(savedDocument);
    } catch (error) {
      this.logger.error(`Failed to upload taxi permit document for vehicle ${vehicleId}`, error.stack);
      throw error;
    }
  }

  async updateTaxiPermitDocument(
    documentId: string,
    driverId: Types.ObjectId,
    taxiPermitVehicleDetails: TaxiPermitVehicleDetailsDto,
  ): Promise<VehicleDocumentResponseDto> {
    try {
      const documentObjectId = new Types.ObjectId(documentId);
      const existingDocument = await this.vehicleDocumentRepository.getVehicleDocumentById(documentObjectId);

      if (!existingDocument || existingDocument.documentType !== VehicleDocumentType.TAXI_PERMIT_VEHICLE) {
        throw new NotFoundException('Taxi permit document not found');
      }

      if (existingDocument.uploadedByDriverId.toString() !== driverId.toString()) {
        throw new BadRequestException('Document does not belong to this driver');
      }

      if (existingDocument.status === VehicleDocumentStatus.VERIFIED) {
        throw new BadRequestException('Cannot update verified document. Please upload a new version.');
      }

      const updateData = {
        taxiPermitVehicleDetails: {
          ...taxiPermitVehicleDetails,
          issueDate: new Date(taxiPermitVehicleDetails.issueDate),
          expiryDate: new Date(taxiPermitVehicleDetails.expiryDate),
        },
        expiryDate: new Date(taxiPermitVehicleDetails.expiryDate),
        status: VehicleDocumentStatus.PENDING,
      };

      const updatedDocument = await this.vehicleDocumentRepository.updateVehicleDocument(documentObjectId, updateData);
      await this.updateVehicleDocumentationStatus(existingDocument.vehicleId);
      return this.mapToResponseDto(updatedDocument!);
    } catch (error) {
      this.logger.error(`Failed to update taxi permit document ${documentId}`, error.stack);
      throw error;
    }
  }

  // ===== Authorization Letter Document Methods =====
  async uploadAuthorizationLetterDocument(
    vehicleId: string,
    driverId: Types.ObjectId,
    authorizationLetterDetails: AuthorizationLetterDetailsDto,
  ): Promise<VehicleDocumentResponseDto> {
    try {
      const vehicleObjectId = new Types.ObjectId(vehicleId);
      await this.verifyVehicleOwnership(vehicleObjectId, driverId);

      const documentData: any = {
        documentType: VehicleDocumentType.AUTHORIZATION_LETTER,
        authorizationLetterDetails: {
          ...authorizationLetterDetails,
          effectiveDate: authorizationLetterDetails.effectiveDate
            ? new Date(authorizationLetterDetails.effectiveDate)
            : undefined,
          expiryDate: authorizationLetterDetails.expiryDate
            ? new Date(authorizationLetterDetails.expiryDate)
            : undefined,
        },
        expiryDate: authorizationLetterDetails.expiryDate ? new Date(authorizationLetterDetails.expiryDate) : undefined,
        isRequired: false,
      };

      const savedDocument = await this.vehicleDocumentRepository.createVehicleDocument(
        vehicleObjectId,
        driverId,
        documentData,
      );

      await this.updateVehicleDocumentationStatus(vehicleObjectId);
      return this.mapToResponseDto(savedDocument);
    } catch (error) {
      this.logger.error(`Failed to upload authorization letter document for vehicle ${vehicleId}`, error.stack);
      throw error;
    }
  }

  async updateAuthorizationLetterDocument(
    documentId: string,
    driverId: Types.ObjectId,
    authorizationLetterDetails: AuthorizationLetterDetailsDto,
  ): Promise<VehicleDocumentResponseDto> {
    try {
      const documentObjectId = new Types.ObjectId(documentId);
      const existingDocument = await this.vehicleDocumentRepository.getVehicleDocumentById(documentObjectId);

      if (!existingDocument || existingDocument.documentType !== VehicleDocumentType.AUTHORIZATION_LETTER) {
        throw new NotFoundException('Authorization letter document not found');
      }

      if (existingDocument.uploadedByDriverId.toString() !== driverId.toString()) {
        throw new BadRequestException('Document does not belong to this driver');
      }

      if (existingDocument.status === VehicleDocumentStatus.VERIFIED) {
        throw new BadRequestException('Cannot update verified document. Please upload a new version.');
      }

      const updateData = {
        authorizationLetterDetails: {
          ...authorizationLetterDetails,
          effectiveDate: authorizationLetterDetails.effectiveDate
            ? new Date(authorizationLetterDetails.effectiveDate)
            : undefined,
          expiryDate: authorizationLetterDetails.expiryDate
            ? new Date(authorizationLetterDetails.expiryDate)
            : undefined,
        },
        expiryDate: authorizationLetterDetails.expiryDate ? new Date(authorizationLetterDetails.expiryDate) : undefined,
        status: VehicleDocumentStatus.PENDING,
      };

      const updatedDocument = await this.vehicleDocumentRepository.updateVehicleDocument(documentObjectId, updateData);
      await this.updateVehicleDocumentationStatus(existingDocument.vehicleId);
      return this.mapToResponseDto(updatedDocument!);
    } catch (error) {
      this.logger.error(`Failed to update authorization letter document ${documentId}`, error.stack);
      throw error;
    }
  }

  // ===== Vehicle Documentation Progress and Status Methods =====
  async getVehicleDocumentationProgress(
    vehicleId: string,
    driverId: Types.ObjectId,
  ): Promise<{
    vehicleId: string;
    totalRequired: number;
    uploaded: number;
    verified: number;
    rejected: number;
    pending: number;
    progressPercentage: number;
    nextStep: string;
    canProceed: boolean;
    missingDocuments: VehicleDocumentType[];
  }> {
    try {
      const summary = await this.getVehicleDocumentsSummary(vehicleId, driverId);
      const requiredTypes = await this.vehicleDocumentRepository.getRequiredDocumentTypes();

      const missingDocuments = requiredTypes.filter((type) => {
        const doc = summary.documents.find((d) => d.documentType === type);
        return !doc || !doc.isUploaded;
      });

      const rejectedDocuments = summary.documents.filter((doc) => doc.status === 'rejected');
      const pending = summary.uploadedCount - summary.verifiedCount - summary.rejectedCount;
      const progressPercentage = Math.round((summary.verifiedCount / requiredTypes.length) * 100);

      let nextStep = '';
      let canProceed = false;

      if (missingDocuments.length > 0) {
        const nextDocType = missingDocuments[0];
        const docNames = {
          [VehicleDocumentType.CAR_INSURANCE]: 'Car Insurance',
          [VehicleDocumentType.PUSPAKOM_INSPECTION]: 'Puspakom Inspection',
          [VehicleDocumentType.TAXI_PERMIT_VEHICLE]: 'Taxi Permit',
          [VehicleDocumentType.CAR_RENTAL_AGREEMENT]: 'Car Rental Agreement',
          [VehicleDocumentType.AUTHORIZATION_LETTER]: 'Authorization Letter',
        };
        nextStep = `Upload ${docNames[nextDocType] || nextDocType}`;
      } else if (rejectedDocuments.length > 0) {
        nextStep = 'Re-upload rejected documents';
      } else if (summary.overallStatus === 'pending') {
        nextStep = 'Wait for document verification';
      } else if (summary.overallStatus === 'verified') {
        nextStep = 'All documents verified';
        canProceed = true;
      }

      return {
        vehicleId,
        totalRequired: requiredTypes.length,
        uploaded: summary.uploadedCount,
        verified: summary.verifiedCount,
        rejected: summary.rejectedCount,
        pending,
        progressPercentage,
        nextStep,
        canProceed,
        missingDocuments,
      };
    } catch (error) {
      this.logger.error(`Failed to get vehicle documentation progress for vehicle ${vehicleId}`, error.stack);
      throw error;
    }
  }

  async getExpiringDriverVehicleDocuments(
    driverId: Types.ObjectId,
    daysAhead: number = 30,
  ): Promise<VehicleDocumentResponseDto[]> {
    try {
      const allDocuments = await this.vehicleDocumentRepository.getDocumentsByDriverId(driverId);
      const expiryThreshold = new Date();
      expiryThreshold.setDate(expiryThreshold.getDate() + daysAhead);

      const expiringDocuments = allDocuments.filter((doc) => {
        return (
          doc.expiryDate &&
          doc.expiryDate <= expiryThreshold &&
          doc.expiryDate >= new Date() &&
          doc.status === VehicleDocumentStatus.VERIFIED
        );
      });

      return expiringDocuments.map((doc) => this.mapToResponseDto(doc));
    } catch (error) {
      this.logger.error(`Failed to get expiring vehicle documents for driver ${driverId}`, error.stack);
      throw error;
    }
  }

  async createVehicleDocument(
    vehicleId: string,
    driverId: Types.ObjectId,
    createDocumentDto: CreateVehicleDocumentDto,
  ): Promise<VehicleDocumentResponseDto> {
    try {
      const vehicleObjectId = new Types.ObjectId(vehicleId);

      // Verify vehicle exists and belongs to driver
      await this.verifyVehicleOwnership(vehicleObjectId, driverId);

      this.validateDocumentData(createDocumentDto);

      const documentData: any = {
        documentType: createDocumentDto.documentType,
        expiryDate: createDocumentDto.expiryDate ? new Date(createDocumentDto.expiryDate) : undefined,
        originalFileName: createDocumentDto.originalFileName,
        isRequired: await this.isDocumentTypeRequired(createDocumentDto.documentType),
      };

      // Add type-specific data
      switch (createDocumentDto.documentType) {
        case VehicleDocumentType.CAR_INSURANCE:
          if (!createDocumentDto.carInsuranceDetails) {
            throw new BadRequestException('Car insurance details are required for CAR_INSURANCE document type');
          }
          documentData.carInsuranceDetails = {
            ...createDocumentDto.carInsuranceDetails,
            insuranceExpiryDate: new Date(createDocumentDto.carInsuranceDetails.insuranceExpiryDate),
          };
          // Set general expiry date from insurance expiry
          documentData.expiryDate = documentData.carInsuranceDetails.insuranceExpiryDate;
          break;

        case VehicleDocumentType.CAR_RENTAL_AGREEMENT:
          if (!createDocumentDto.carRentalAgreementDetails) {
            throw new BadRequestException(
              'Car rental agreement details are required for CAR_RENTAL_AGREEMENT document type',
            );
          }
          documentData.carRentalAgreementDetails = {
            ...createDocumentDto.carRentalAgreementDetails,
            startDate: createDocumentDto.carRentalAgreementDetails.startDate
              ? new Date(createDocumentDto.carRentalAgreementDetails.startDate)
              : undefined,
            endDate: createDocumentDto.carRentalAgreementDetails.endDate
              ? new Date(createDocumentDto.carRentalAgreementDetails.endDate)
              : undefined,
          };
          // Set general expiry date from rental end date
          if (documentData.carRentalAgreementDetails.endDate) {
            documentData.expiryDate = documentData.carRentalAgreementDetails.endDate;
          }
          break;

        case VehicleDocumentType.PUSPAKOM_INSPECTION:
          if (!createDocumentDto.puspakomInspectionDetails) {
            throw new BadRequestException(
              'Puspakom inspection details are required for PUSPAKOM_INSPECTION document type',
            );
          }
          documentData.puspakomInspectionDetails = {
            ...createDocumentDto.puspakomInspectionDetails,
            inspectionDate: createDocumentDto.puspakomInspectionDetails.inspectionDate
              ? new Date(createDocumentDto.puspakomInspectionDetails.inspectionDate)
              : undefined,
            expiryDate: createDocumentDto.puspakomInspectionDetails.expiryDate
              ? new Date(createDocumentDto.puspakomInspectionDetails.expiryDate)
              : undefined,
          };
          // Set general expiry date from inspection expiry
          if (documentData.puspakomInspectionDetails.expiryDate) {
            documentData.expiryDate = documentData.puspakomInspectionDetails.expiryDate;
          }
          break;

        case VehicleDocumentType.TAXI_PERMIT_VEHICLE:
          if (!createDocumentDto.taxiPermitVehicleDetails) {
            throw new BadRequestException('Taxi permit details are required for TAXI_PERMIT_VEHICLE document type');
          }
          documentData.taxiPermitVehicleDetails = {
            ...createDocumentDto.taxiPermitVehicleDetails,
            issueDate: new Date(createDocumentDto.taxiPermitVehicleDetails.issueDate),
            expiryDate: new Date(createDocumentDto.taxiPermitVehicleDetails.expiryDate),
          };
          // Set general expiry date from permit expiry
          documentData.expiryDate = documentData.taxiPermitVehicleDetails.expiryDate;
          break;

        case VehicleDocumentType.AUTHORIZATION_LETTER:
          if (!createDocumentDto.authorizationLetterDetails) {
            throw new BadRequestException(
              'Authorization letter details are required for AUTHORIZATION_LETTER document type',
            );
          }
          documentData.authorizationLetterDetails = {
            ...createDocumentDto.authorizationLetterDetails,
            effectiveDate: createDocumentDto.authorizationLetterDetails.effectiveDate
              ? new Date(createDocumentDto.authorizationLetterDetails.effectiveDate)
              : undefined,
            expiryDate: createDocumentDto.authorizationLetterDetails.expiryDate
              ? new Date(createDocumentDto.authorizationLetterDetails.expiryDate)
              : undefined,
          };
          // Set general expiry date from authorization expiry
          if (documentData.authorizationLetterDetails.expiryDate) {
            documentData.expiryDate = documentData.authorizationLetterDetails.expiryDate;
          }
          break;

        default:
          throw new BadRequestException(`Unsupported document type: ${createDocumentDto.documentType}`);
      }

      const savedDocument = await this.vehicleDocumentRepository.createVehicleDocument(
        vehicleObjectId,
        driverId,
        documentData,
      );

      // Update vehicle documentation status
      await this.updateVehicleDocumentationStatus(vehicleObjectId);

      return this.mapToResponseDto(savedDocument);
    } catch (error) {
      this.logger.error(`Failed to create vehicle document for vehicle ${vehicleId}`, error.stack);

      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }

      throw new BadRequestException('Failed to create vehicle document');
    }
  }

  async updateVehicleDocument(
    documentId: string,
    driverId: Types.ObjectId,
    updateDocumentDto: UpdateVehicleDocumentDto,
  ): Promise<VehicleDocumentResponseDto> {
    try {
      const documentObjectId = new Types.ObjectId(documentId);

      // Verify document exists and belongs to driver
      const existingDocument = await this.vehicleDocumentRepository.getVehicleDocumentById(documentObjectId);

      if (!existingDocument) {
        throw new NotFoundException('Document not found');
      }

      if (existingDocument.uploadedByDriverId.toString() !== driverId.toString()) {
        throw new BadRequestException('Document does not belong to this driver');
      }

      if (existingDocument.status === VehicleDocumentStatus.VERIFIED) {
        throw new BadRequestException('Cannot update verified document. Please upload a new version.');
      }

      const updateData: any = {
        originalFileName: updateDocumentDto.originalFileName,
      };

      // Update type-specific data
      if (
        updateDocumentDto.carInsuranceDetails &&
        existingDocument.documentType === VehicleDocumentType.CAR_INSURANCE
      ) {
        updateData.carInsuranceDetails = {
          ...updateDocumentDto.carInsuranceDetails,
          insuranceExpiryDate: new Date(updateDocumentDto.carInsuranceDetails.insuranceExpiryDate),
        };
        updateData.expiryDate = updateData.carInsuranceDetails.insuranceExpiryDate;
      }

      if (
        updateDocumentDto.carRentalAgreementDetails &&
        existingDocument.documentType === VehicleDocumentType.CAR_RENTAL_AGREEMENT
      ) {
        updateData.carRentalAgreementDetails = {
          ...updateDocumentDto.carRentalAgreementDetails,
          startDate: updateDocumentDto.carRentalAgreementDetails.startDate
            ? new Date(updateDocumentDto.carRentalAgreementDetails.startDate)
            : undefined,
          endDate: updateDocumentDto.carRentalAgreementDetails.endDate
            ? new Date(updateDocumentDto.carRentalAgreementDetails.endDate)
            : undefined,
        };
        if (updateData.carRentalAgreementDetails.endDate) {
          updateData.expiryDate = updateData.carRentalAgreementDetails.endDate;
        }
      }

      if (
        updateDocumentDto.puspakomInspectionDetails &&
        existingDocument.documentType === VehicleDocumentType.PUSPAKOM_INSPECTION
      ) {
        updateData.puspakomInspectionDetails = {
          ...updateDocumentDto.puspakomInspectionDetails,
          inspectionDate: updateDocumentDto.puspakomInspectionDetails.inspectionDate
            ? new Date(updateDocumentDto.puspakomInspectionDetails.inspectionDate)
            : undefined,
          expiryDate: updateDocumentDto.puspakomInspectionDetails.expiryDate
            ? new Date(updateDocumentDto.puspakomInspectionDetails.expiryDate)
            : undefined,
        };
        if (updateData.puspakomInspectionDetails.expiryDate) {
          updateData.expiryDate = updateData.puspakomInspectionDetails.expiryDate;
        }
      }

      if (
        updateDocumentDto.taxiPermitVehicleDetails &&
        existingDocument.documentType === VehicleDocumentType.TAXI_PERMIT_VEHICLE
      ) {
        updateData.taxiPermitVehicleDetails = {
          ...updateDocumentDto.taxiPermitVehicleDetails,
          issueDate: new Date(updateDocumentDto.taxiPermitVehicleDetails.issueDate),
          expiryDate: new Date(updateDocumentDto.taxiPermitVehicleDetails.expiryDate),
        };
        updateData.expiryDate = updateData.taxiPermitVehicleDetails.expiryDate;
      }

      if (
        updateDocumentDto.authorizationLetterDetails &&
        existingDocument.documentType === VehicleDocumentType.AUTHORIZATION_LETTER
      ) {
        updateData.authorizationLetterDetails = {
          ...updateDocumentDto.authorizationLetterDetails,
          effectiveDate: updateDocumentDto.authorizationLetterDetails.effectiveDate
            ? new Date(updateDocumentDto.authorizationLetterDetails.effectiveDate)
            : undefined,
          expiryDate: updateDocumentDto.authorizationLetterDetails.expiryDate
            ? new Date(updateDocumentDto.authorizationLetterDetails.expiryDate)
            : undefined,
        };
        if (updateData.authorizationLetterDetails.expiryDate) {
          updateData.expiryDate = updateData.authorizationLetterDetails.expiryDate;
        }
      }

      if (updateDocumentDto.expiryDate) {
        updateData.expiryDate = new Date(updateDocumentDto.expiryDate);
      }

      // Reset status to pending if document content is updated
      if (Object.keys(updateData).length > 1 || updateData.expiryDate) {
        // More than just originalFileName
        updateData.status = VehicleDocumentStatus.PENDING;
        updateData.verifiedAt = undefined;
        updateData.verifiedByAdminId = undefined;
        updateData.verificationNotes = undefined;
        updateData.rejectionReason = undefined;
        updateData.rejectedAt = undefined;
      }

      const updatedDocument = await this.vehicleDocumentRepository.updateVehicleDocument(documentObjectId, updateData);

      if (!updatedDocument) {
        throw new NotFoundException('Document not found');
      }

      // Update vehicle documentation status
      await this.updateVehicleDocumentationStatus(existingDocument.vehicleId);

      return this.mapToResponseDto(updatedDocument);
    } catch (error) {
      this.logger.error(`Failed to update vehicle document ${documentId}`, error.stack);

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Failed to update vehicle document');
    }
  }

  async getVehicleDocument(documentId: string, driverId: Types.ObjectId): Promise<VehicleDocumentResponseDto> {
    try {
      const documentObjectId = new Types.ObjectId(documentId);
      const document = await this.vehicleDocumentRepository.getVehicleDocumentById(documentObjectId);

      if (!document) {
        throw new NotFoundException('Document not found');
      }

      if (document.uploadedByDriverId.toString() !== driverId.toString()) {
        throw new BadRequestException('Document does not belong to this driver');
      }

      return this.mapToResponseDto(document);
    } catch (error) {
      this.logger.error(`Failed to get vehicle document ${documentId}`, error.stack);

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Failed to get vehicle document');
    }
  }

  async getVehicleDocumentByType(
    vehicleId: string,
    documentType: VehicleDocumentType,
    driverId: Types.ObjectId,
  ): Promise<any> {
    try {
      const vehicleObjectId = new Types.ObjectId(vehicleId);

      // Verify vehicle belongs to driver
      await this.verifyVehicleOwnership(vehicleObjectId, driverId);

      const document = await this.vehicleDocumentRepository.getVehicleDocumentByType(vehicleObjectId, documentType);

      return document ? { data: this.mapToResponseDto(document), success: true } : { data: null, success: true };
    } catch (error) {
      this.logger.error(`Failed to get vehicle document by type for vehicle ${vehicleId}`, error.stack);

      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }

      throw new BadRequestException('Failed to get vehicle document');
    }
  }

  async getAllVehicleDocuments(
    vehicleId: string,
    driverId: Types.ObjectId,
    includeInactive: boolean = false,
  ): Promise<VehicleDocumentResponseDto[]> {
    try {
      const vehicleObjectId = new Types.ObjectId(vehicleId);

      // Verify vehicle belongs to driver
      await this.verifyVehicleOwnership(vehicleObjectId, driverId);

      const documents = await this.vehicleDocumentRepository.getAllVehicleDocuments(vehicleObjectId, includeInactive);

      return documents.map((doc) => this.mapToResponseDto(doc));
    } catch (error) {
      this.logger.error(`Failed to get all vehicle documents for vehicle ${vehicleId}`, error.stack);

      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }

      throw new BadRequestException('Failed to get vehicle documents');
    }
  }

  async getVehicleDocumentsSummary(vehicleId: string, driverId: Types.ObjectId): Promise<VehicleDocumentsSummaryDto> {
    try {
      const vehicleObjectId = new Types.ObjectId(vehicleId);

      // Verify vehicle belongs to driver
      await this.verifyVehicleOwnership(vehicleObjectId, driverId);

      const documents = await this.vehicleDocumentRepository.getAllVehicleDocuments(vehicleObjectId);
      const requiredTypes = await this.vehicleDocumentRepository.getRequiredDocumentTypes();

      const documentMap = new Map();
      documents.forEach((doc) => {
        documentMap.set(doc.documentType, doc);
      });

      const documentStatuses = Object.values(VehicleDocumentType).map((docType) => {
        const document = documentMap.get(docType);
        const isRequired = requiredTypes.includes(docType);

        return {
          documentType: docType,
          isUploaded: !!document,
          status: document?.status || 'not_uploaded',
          expiryDate: document?.expiryDate,
          isExpiringSoon: document?.isExpiringSoon || false,
          isRequired,
        };
      });

      let verifiedCount = 0;
      let rejectedCount = 0;
      let expiringSoonCount = 0;

      documents.forEach((doc) => {
        if (doc.status === VehicleDocumentStatus.VERIFIED) {
          verifiedCount++;
        } else if (doc.status === VehicleDocumentStatus.REJECTED) {
          rejectedCount++;
        }

        if (doc.isExpiringSoon) {
          expiringSoonCount++;
        }
      });

      const requiredUploadedCount = requiredTypes.filter((docType) => documentMap.has(docType)).length;
      const requiredVerifiedCount = requiredTypes.filter((docType) => {
        const doc = documentMap.get(docType);
        return doc && doc.status === VehicleDocumentStatus.VERIFIED;
      }).length;

      const hasCompleteDocumentation = requiredVerifiedCount === requiredTypes.length;

      let overallStatus: 'pending' | 'verified' | 'rejected' | 'incomplete';
      if (hasCompleteDocumentation) {
        overallStatus = 'verified';
      } else if (rejectedCount > 0) {
        overallStatus = 'rejected';
      } else if (requiredUploadedCount === requiredTypes.length) {
        overallStatus = 'pending';
      } else {
        overallStatus = 'incomplete';
      }

      return {
        vehicleId,
        documents: documentStatuses,
        hasCompleteDocumentation,
        overallStatus,
        uploadedCount: documents.length,
        verifiedCount,
        rejectedCount,
        requiredCount: requiredTypes.length,
        expiringSoonCount,
        // lastUpdated:
        //   documents.length > 0 ? new Date(Math.max(...documents.map((d) => d?.lastUpdatedAt.getTime()))) : new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get vehicle documents summary for vehicle ${vehicleId}`, error.stack);

      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }

      throw new BadRequestException('Failed to get vehicle documents summary');
    }
  }

  async deleteVehicleDocument(documentId: string, driverId: Types.ObjectId): Promise<void> {
    try {
      const documentObjectId = new Types.ObjectId(documentId);
      const document = await this.vehicleDocumentRepository.getVehicleDocumentById(documentObjectId);

      if (!document) {
        throw new NotFoundException('Document not found');
      }

      if (document.uploadedByDriverId.toString() !== driverId.toString()) {
        throw new BadRequestException('Document does not belong to this driver');
      }

      if (document.status === VehicleDocumentStatus.VERIFIED) {
        throw new BadRequestException('Cannot delete verified document');
      }

      await this.vehicleDocumentRepository.updateVehicleDocument(documentObjectId, {
        isActive: false,
      });

      // Update vehicle documentation status
      await this.updateVehicleDocumentationStatus(document.vehicleId);
    } catch (error) {
      this.logger.error(`Failed to delete vehicle document ${documentId}`, error.stack);

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Failed to delete vehicle document');
    }
  }

  async getDriverVehicleDocuments(driverId: Types.ObjectId): Promise<VehicleDocumentResponseDto[]> {
    try {
      const documents = await this.vehicleDocumentRepository.getDocumentsByDriverId(driverId);
      return documents.map((doc) => this.mapToResponseDto(doc));
    } catch (error) {
      this.logger.error(`Failed to get driver vehicle documents for driver ${driverId}`, error.stack);
      throw new BadRequestException('Failed to get driver vehicle documents');
    }
  }

  private async verifyVehicleOwnership(vehicleId: Types.ObjectId, driverId: Types.ObjectId): Promise<void> {
    const vehicle = await this.vehicleRepository.getVehicleById(vehicleId);

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    if (vehicle.driverId.toString() !== driverId.toString()) {
      throw new ForbiddenException('Vehicle does not belong to this driver');
    }
  }

  private async updateVehicleDocumentationStatus(vehicleId: Types.ObjectId): Promise<void> {
    try {
      const completenessCheck = await this.vehicleDocumentRepository.checkDocumentCompleteness(vehicleId);
      await this.vehicleRepository.updateDocumentationStatus(vehicleId, completenessCheck.isComplete);
    } catch (error) {
      this.logger.error(`Failed to update vehicle documentation status for vehicle ${vehicleId}`, error.stack);
      // Don't throw error here as this is a secondary operation
    }
  }

  private async isDocumentTypeRequired(documentType: VehicleDocumentType): Promise<boolean> {
    const requiredTypes = await this.vehicleDocumentRepository.getRequiredDocumentTypes();
    return requiredTypes.includes(documentType);
  }

  private validateDocumentData(createDocumentDto: CreateVehicleDocumentDto): void {
    const { documentType } = createDocumentDto;

    switch (documentType) {
      case VehicleDocumentType.CAR_INSURANCE:
        if (!createDocumentDto.carInsuranceDetails) {
          throw new BadRequestException('Car insurance details are required for CAR_INSURANCE document type');
        }
        break;

      case VehicleDocumentType.CAR_RENTAL_AGREEMENT:
        if (!createDocumentDto.carRentalAgreementDetails) {
          throw new BadRequestException(
            'Car rental agreement details are required for CAR_RENTAL_AGREEMENT document type',
          );
        }
        break;

      case VehicleDocumentType.PUSPAKOM_INSPECTION:
        if (!createDocumentDto.puspakomInspectionDetails) {
          throw new BadRequestException(
            'Puspakom inspection details are required for PUSPAKOM_INSPECTION document type',
          );
        }
        break;

      case VehicleDocumentType.TAXI_PERMIT_VEHICLE:
        if (!createDocumentDto.taxiPermitVehicleDetails) {
          throw new BadRequestException('Taxi permit details are required for TAXI_PERMIT_VEHICLE document type');
        }
        break;

      case VehicleDocumentType.AUTHORIZATION_LETTER:
        if (!createDocumentDto.authorizationLetterDetails) {
          throw new BadRequestException(
            'Authorization letter details are required for AUTHORIZATION_LETTER document type',
          );
        }
        break;

      default:
        throw new BadRequestException(`Unsupported document type: ${documentType}`);
    }
  }

  private mapToResponseDto(document: any): VehicleDocumentResponseDto {
    return {
      _id: document._id.toString(),
      vehicleId: document.vehicleId.toString(),
      uploadedByDriverId: document.uploadedByDriverId.toString(),
      documentType: document.documentType,
      status: document.status,
      carInsuranceDetails: document.carInsuranceDetails
        ? {
            ...document.carInsuranceDetails?._doc,
            insuranceExpiryDate: document.carInsuranceDetails.insuranceExpiryDate?.toISOString(),
          }
        : undefined,
      carRentalAgreementDetails: document.carRentalAgreementDetails
        ? {
            ...document.carRentalAgreementDetails?._doc,
            startDate: document.carRentalAgreementDetails.startDate?.toISOString(),
            endDate: document.carRentalAgreementDetails.endDate?.toISOString(),
          }
        : undefined,
      puspakomInspectionDetails: document.puspakomInspectionDetails
        ? {
            ...document.puspakomInspectionDetails?._doc,
            inspectionDate: document.puspakomInspectionDetails.inspectionDate?.toISOString(),
            expiryDate: document.puspakomInspectionDetails.expiryDate?.toISOString(),
          }
        : undefined,
      taxiPermitVehicleDetails: document.taxiPermitVehicleDetails
        ? {
            ...document.taxiPermitVehicleDetails?._doc,
            issueDate: document.taxiPermitVehicleDetails.issueDate?.toISOString(),
            expiryDate: document.taxiPermitVehicleDetails.expiryDate?.toISOString(),
          }
        : undefined,
      authorizationLetterDetails: document.authorizationLetterDetails
        ? {
            ...document.authorizationLetterDetails?._doc,
            effectiveDate: document.authorizationLetterDetails.effectiveDate?.toISOString(),
            expiryDate: document.authorizationLetterDetails.expiryDate?.toISOString(),
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
      isRequired: document.isRequired,
      originalFileName: document.originalFileName,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }
}
