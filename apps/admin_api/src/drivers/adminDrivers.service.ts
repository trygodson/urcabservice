import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  DocumentStatus,
  VehicleStatus,
  VehicleDocumentStatus,
  Role,
  DocumentType,
  VehicleDocumentType,
  WalletTransaction,
  TransactionCategory,
  TransactionStatus,
  Settings,
  Rating,
  RatingDocument,
  WalletRepository,
  RideStatus,
  TransactionType,
  BalanceType,
  User,
  UserDocument,
} from '@urcab-workspace/shared';
import {
  GetDriversDto,
  DocumentApprovalDto,
  VehicleApprovalDto,
  VehicleDocumentApprovalDto,
  GetRidesDto,
  GetReportsDto,
  AssignReportDto,
  ResolveReportDto,
  CreateDriverEvpDto,
  GetDriverEvpsDto,
  RevokeDriverEvpDto,
  DriverEvpResponseDto,
  VehicleRejectionDto,
  CreateVehicleEvpDto,
  VehicleEvpResponseDto,
  GetEvpEligibleDriversDto,
} from './dto';
import {
  AdminDriverDocumentRepository,
  AdminDriverEvpRepository,
  AdminIssueReportRepository,
  AdminRideRepository,
  AdminUserRepository,
  AdminVehicleDocumentRepository,
  AdminVehicleRepository,
} from './repository';

@Injectable()
export class AdminDriversService {
  constructor(
    private readonly userRepository: AdminUserRepository,
    private readonly driverDocumentRepository: AdminDriverDocumentRepository,
    private readonly vehicleRepository: AdminVehicleRepository,
    private readonly vehicleDocumentRepository: AdminVehicleDocumentRepository,
    private readonly rideRepository: AdminRideRepository,
    private readonly issueReportRepository: AdminIssueReportRepository,
    private readonly driverEvpRepository: AdminDriverEvpRepository,
    private readonly walletRepository: WalletRepository,
    @InjectModel(WalletTransaction.name) private readonly transactionModel: Model<WalletTransaction>,
    @InjectModel(Settings.name) private readonly settingsModel: Model<Settings>,
    @InjectModel(Rating.name) private readonly ratingModel: Model<RatingDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  // Driver Management Methods
  async getAllDrivers(query: GetDriversDto) {
    const { page = 1, limit = 10, search, status, documentStatus, isVerified } = query;
    const skip = (page - 1) * limit;

    const filter: any = { type: Role.DRIVER };

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    if (status === 'ACTIVE') filter.isActive = true;
    if (status === 'INACTIVE') filter.isActive = false;
    if (typeof isVerified === 'boolean') filter.isDriverVerified = isVerified;

    const drivers = await this.userRepository.findWithPagination(filter, skip, limit, {
      populate: [{ path: 'driverVerifiedByAdminId', select: 'firstName lastName email' }],
      sort: { createdAt: -1 },
    });

    const total = await this.userRepository.countDocuments(filter);

    return {
      drivers: drivers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getDriverDetails(driverId: string) {
    const driver = await this.userRepository.findOne(
      { _id: new Types.ObjectId(driverId), type: Role.DRIVER },
      {
        populate: [{ path: 'driverVerifiedByAdminId', select: 'firstName lastName email' }],
      },
    );

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    // Get driver documents with detailed status
    const documentDetails = await this.getDriverDocuments(driverId);

    // Get driver vehicles with their active EVPs
    const vehiclesList = await this.vehicleRepository.find(
      { driverId: new Types.ObjectId(driverId) },
      {
        populate: [{ path: 'verifiedByAdminId', select: 'firstName lastName email' }],
        sort: { createdAt: -1 },
      },
    );

    // Get active EVP for each vehicle
    const vehiclesWithEvp = await Promise.all(
      vehiclesList.map(async (vehicle) => {
        const vehicleId = typeof vehicle._id === 'string' ? new Types.ObjectId(vehicle._id) : vehicle._id;
        const activeEvp = await this.driverEvpRepository.findOne({
          vehicleId: vehicleId,
          isActive: true,
          endDate: { $gt: new Date() }, // Not expired
          revokedAt: { $exists: false }, // Not revoked
        });

        return {
          ...vehicle.toObject(),
          activeEvp: activeEvp ? this.mapToVehicleEvpResponseDto(activeEvp) : null,
        };
      }),
    );

    // Get recent rides
    const recentRides = await this.rideRepository.find(
      { driverId: new Types.ObjectId(driverId) },
      {
        populate: [{ path: 'passengerId', select: 'firstName lastName email phone' }],
        sort: { createdAt: -1 },
        limit: 10,
      },
    );

    // Calculate statistics
    const statistics = await this.calculateDriverStatistics(driverId);

    // Get wallet balance
    const walletBalance = await this.getDriverWalletBalance(new Types.ObjectId(driverId));

    return {
      driver,
      // documents: documentDetails.documents,
      documentStatus: {
        stats: documentDetails.stats,
        status: documentDetails.overallStatus,
        documentStatuses: documentDetails.documentStatuses,
        hasCompleteDocumentation: documentDetails.hasCompleteDocumentation,
      },
      vehicles: vehiclesWithEvp,
      recentRides,
      statistics,
      walletBalance,
    };
  }

  async verifyDriver(driverId: string, isVerified: boolean, notes?: string) {
    const driver = await this.userRepository.findOne({
      _id: new Types.ObjectId(driverId),
      type: Role.DRIVER,
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    const updateData: any = {
      isDriverVerified: isVerified,
      hasCompleteDocumentation: isVerified,
      driverVerifiedAt: isVerified ? new Date() : null,
      // driverVerifiedByAdminId: adminId, // You'll need to get this from JWT token
    };

    return this.userRepository.findOneAndUpdate({ _id: new Types.ObjectId(driverId) }, updateData);
  }

  async updateDriverStatus(driverId: string, isActive: boolean, reason?: string) {
    const driver = await this.userRepository.findOne({
      _id: new Types.ObjectId(driverId),
      type: Role.DRIVER,
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return this.userRepository.findOneAndUpdate({ _id: new Types.ObjectId(driverId) }, { isActive });
  }

  // Driver Documents Methods
  async getDriverDocuments(driverId: string) {
    // Get all documents for this driver
    const documents = await this.driverDocumentRepository.model
      .find({ driverId: new Types.ObjectId(driverId), isActive: true })
      .populate({ path: 'verifiedByAdminId', select: 'firstName lastName email' })
      .sort({ createdAt: -1 })
      .exec();

    // Create a map of document types for easier lookup
    const documentMap = new Map();
    documents.forEach((doc) => {
      documentMap.set(doc.documentType, doc);
    });

    // Get required documents from DOCUMENT_REQUIREMENTS
    const requiredDocuments = this.DOCUMENT_REQUIREMENTS.filter((req) => req.isRequired);

    // For each required document, check if it exists and its status
    const documentStatuses = this.DOCUMENT_REQUIREMENTS.map((requirement) => {
      const { documentType, displayName, isRequired, hasExpiry } = requirement;
      const document = documentMap.get(documentType);

      let status = 'missing';
      let expiryStatus = null;
      let expiryDate = null;

      if (document) {
        status = document.status;
        expiryDate = document.expiryDate;

        // Check expiry status for documents with expiry dates
        if (hasExpiry && expiryDate) {
          const now = new Date();
          const expiry = new Date(expiryDate);
          const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          if (expiry < now) {
            expiryStatus = 'expired';
          } else if (daysUntilExpiry <= 30) {
            expiryStatus = 'expiring_soon';
          } else {
            expiryStatus = 'valid';
          }
        }
      }

      return {
        documentType,
        displayName,
        isRequired,
        hasExpiry,
        status,
        expiryStatus,
        expiryDate,
        document: document || null,
      };
    });

    // Calculate statistics
    const verifiedCount = documents.filter((doc) => doc.status === DocumentStatus.VERIFIED).length;
    const rejectedCount = documents.filter((doc) => doc.status === DocumentStatus.REJECTED).length;
    const expiringSoonCount = documentStatuses.filter((doc) => doc.expiryStatus === 'expiring_soon').length;
    const expiredCount = documentStatuses.filter((doc) => doc.expiryStatus === 'expired').length;

    // Calculate overall status
    let overallStatus = 'incomplete';
    const missingRequiredDocs = requiredDocuments.filter((req) => !documentMap.has(req.documentType)).length;

    const unverifiedRequiredDocs = requiredDocuments.filter((req) => {
      const doc = documentMap.get(req.documentType);
      return doc && doc.status !== DocumentStatus.VERIFIED;
    }).length;

    const expiredRequiredDocs = requiredDocuments.filter((req) => {
      if (!req.hasExpiry) return false;

      const doc = documentMap.get(req.documentType);
      if (!doc || !doc.expiryDate) return false;

      return new Date(doc.expiryDate) < new Date();
    }).length;

    // Determine if all required documents are complete
    const hasCompleteDocumentation =
      missingRequiredDocs === 0 && unverifiedRequiredDocs === 0 && expiredRequiredDocs === 0;

    // Set overall status based on document state
    if (hasCompleteDocumentation) {
      overallStatus = 'complete';
    } else if (expiredRequiredDocs > 0) {
      overallStatus = 'expired';
    } else if (rejectedCount > 0) {
      overallStatus = 'rejected';
    } else if (documents.length === 0) {
      overallStatus = 'not_started';
    }

    // Return comprehensive document status information
    return {
      driverId: driverId.toString(),
      // documents,
      documentStatuses,
      hasCompleteDocumentation,
      overallStatus,
      stats: {
        uploadedCount: documents.length,
        requiredCount: requiredDocuments.length,
        verifiedCount,
        rejectedCount,
        expiringSoonCount,
        expiredCount,
        missingRequiredCount: missingRequiredDocs,
        unverifiedRequiredCount: unverifiedRequiredDocs,
      },
    };
  }

  async getDocumentDetails(documentId: string) {
    const document = await this.driverDocumentRepository.findOne(
      { _id: new Types.ObjectId(documentId) },
      {
        populate: [
          { path: 'driverId', select: 'firstName lastName email phone' },
          { path: 'verifiedByAdminId', select: 'firstName lastName email' },
        ],
      },
    );

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async approveDriverDocument(documentId: string, body: DocumentApprovalDto) {
    const document = await this.driverDocumentRepository.findOne({
      _id: new Types.ObjectId(documentId),
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const updateData = {
      status: DocumentStatus.VERIFIED,
      verifiedAt: new Date(),
      // verifiedByAdminId: adminId, // Get from JWT
      verificationNotes: body.verificationNotes,
      adminNotes: body.adminNotes,
    };

    const updatedDocument = await this.driverDocumentRepository.findOneAndUpdate(
      { _id: new Types.ObjectId(documentId) },
      updateData,
    );

    // Update driver's document completion status
    await this.updateDriverDocumentCompletionStatus(document.driverId);

    return updatedDocument;
  }

  async rejectDriverDocument(documentId: string, body: DocumentApprovalDto) {
    const document = await this.driverDocumentRepository.findOne({
      _id: new Types.ObjectId(documentId),
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const updateData = {
      status: DocumentStatus.REJECTED,
      rejectedAt: new Date(),
      rejectionReason: body.rejectionReason,
      adminNotes: body.adminNotes,
    };
    let updatedDocument = await this.driverDocumentRepository.findOneAndUpdate(
      { _id: new Types.ObjectId(documentId) },
      updateData,
    );

    await this.updateDriverDocumentCompletionStatus(updatedDocument.driverId);

    return updatedDocument;
  }

  async getPendingDriverDocuments(query: any) {
    const { page = 1, limit = 10, documentType } = query;
    const skip = (page - 1) * limit;

    const filter: any = { status: DocumentStatus.PENDING };
    if (documentType) filter.documentType = documentType;
    console.log(filter, '====docus');

    const documents = await this.driverDocumentRepository.findWithPagination(filter, skip, limit, {
      populate: [{ path: 'driverId', select: 'firstName lastName email phone' }],
      sort: { createdAt: 1 }, // Oldest first
    });

    const total = await this.driverDocumentRepository.countDocuments(filter);

    return {
      documents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Vehicle Management Methods
  async getDriverVehicles(driverId: string) {
    return this.vehicleRepository.find(
      { driverId: new Types.ObjectId(driverId) },
      {
        populate: [{ path: 'verifiedByAdminId', select: 'firstName lastName email' }],
        sort: { isPrimary: -1, createdAt: -1 },
      },
    );
  }

  async getVehicleDetails(vehicleId: string) {
    const vehicle = await this.vehicleRepository.findOne(
      { _id: new Types.ObjectId(vehicleId) },
      {
        populate: [
          { path: 'driverId', select: 'firstName lastName email phone' },
          { path: 'verifiedByAdminId', select: 'firstName lastName email' },
        ],
      },
    );

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    // Get vehicle documents with enhanced status
    const documentDetails = await this.getVehicleDocuments(vehicleId);

    return {
      vehicle,
      documentStatus: {
        stats: documentDetails.stats,
        status: documentDetails.overallStatus,
        documentStatuses: documentDetails.documentStatuses,
        hasCompleteDocumentation: documentDetails.hasCompleteDocumentation,
      },
    };
  }

  async approveVehicle(vehicleId: string, body?: VehicleApprovalDto) {
    const vehicle = await this.vehicleRepository.findOne({
      _id: new Types.ObjectId(vehicleId),
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    if (vehicle.hasCompleteDocumentation && vehicle.status === VehicleStatus.VERIFIED) {
      throw new BadRequestException('Vehicle is already verified');
    }

    const documentDetails = await this.getVehicleDocuments(vehicleId);
    if (documentDetails.overallStatus !== 'complete' || !documentDetails.hasCompleteDocumentation) {
      throw new BadRequestException('Vehicle documents are not complete');
    }

    let updateData: any = {
      status: VehicleStatus.VERIFIED,
      verifiedAt: new Date(),
      hasCompleteDocumentation: true,

      // verifiedByAdminId: adminId, // Get from JWT
      // verificationNotes: body.verificationNotes,
    };

    const existingActiveEvp = await this.driverEvpRepository.findOne({
      vehicleId: vehicleId,
      isActive: true,
      endDate: { $gt: new Date() }, // Not expired
      revokedAt: { $exists: false }, // Not revoked
    });

    // Only set EVP price if there's no active EVP
    if (!existingActiveEvp) {
      // Get global EVP price and period from settings
      try {
        const settings = await this.settingsModel.findOne().exec();
        if (settings && settings.globalVehicleEvpPrice && settings.globalVehicleEvpPrice > 0) {
          updateData.evpPrice = settings.globalVehicleEvpPrice;
          updateData.evpPriceSet = true;

          // Set EVP period if available in settings
          if (settings.globalVehicleEvpPeriod && settings.globalVehicleEvpPeriod > 0) {
            updateData.evpPeriod = settings.globalVehicleEvpPeriod;
          }
        }
      } catch (error) {
        // If settings are not available, skip auto-setting EVP price
        console.error('Failed to get global EVP price from settings:', error);
      }
    }

    return this.vehicleRepository.findOneAndUpdate({ _id: new Types.ObjectId(vehicleId) }, updateData);
  }

  async rejectVehicle(vehicleId: string, body?: VehicleRejectionDto) {
    const vehicle = await this.vehicleRepository.findOne({
      _id: new Types.ObjectId(vehicleId),
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    // const documentDetails = await this.getVehicleDocuments(vehicleId);
    // if (documentDetails.overallStatus === 'complete' || !documentDetails.hasCompleteDocumentation) {
    //   throw new BadRequestException('Vehicle documents are complete');
    // }

    const updateData = {
      status: VehicleStatus.REJECTED,
      hasCompleteDocumentation: false,
      evpPriceSet: false,
      // evpPrice: null,
      // evpPeriod: null,
      rejectionReason: body.rejectionReason,
    };

    return this.vehicleRepository.findOneAndUpdate({ _id: new Types.ObjectId(vehicleId) }, updateData);
  }

  // Vehicle Documents Methods
  async getVehicleDocuments(vehicleId: string) {
    // Get all documents for this vehicle
    const documents = await this.vehicleDocumentRepository.model
      .find({ vehicleId: new Types.ObjectId(vehicleId), isActive: true })
      .populate({ path: 'verifiedByAdminId', select: 'firstName lastName email' })
      .sort({ createdAt: -1 })
      .exec();

    // Create a map of document types for easier lookup
    const documentMap = new Map();
    documents.forEach((doc) => {
      documentMap.set(doc.documentType, doc);
    });

    // Get required documents from VEHICLE_DOCUMENT_REQUIREMENTS
    const requiredDocuments = this.VEHICLE_DOCUMENT_REQUIREMENTS.filter((req) => req.isRequired);

    // For each required document, check if it exists and its status
    const documentStatuses = this.VEHICLE_DOCUMENT_REQUIREMENTS.map((requirement) => {
      const { documentType, displayName, isRequired, hasExpiry } = requirement;
      const document = documentMap.get(documentType);

      let status = 'missing';
      let expiryStatus = null;
      let expiryDate = null;

      if (document) {
        status = document.status;
        expiryDate = document.expiryDate;

        // Check expiry status for documents with expiry dates
        if (hasExpiry && expiryDate) {
          const now = new Date();
          const expiry = new Date(expiryDate);
          const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          if (expiry < now) {
            expiryStatus = 'expired';
          } else if (daysUntilExpiry <= 30) {
            expiryStatus = 'expiring_soon';
          } else {
            expiryStatus = 'valid';
          }
        }
      }

      return {
        documentType,
        displayName,
        isRequired,
        hasExpiry,
        status,
        expiryStatus,
        expiryDate,
        document: document || null,
      };
    });

    // Calculate statistics
    const verifiedCount = documents.filter((doc) => doc.status === VehicleDocumentStatus.VERIFIED).length;
    const rejectedCount = documents.filter((doc) => doc.status === VehicleDocumentStatus.REJECTED).length;
    const expiringSoonCount = documentStatuses.filter((doc) => doc.expiryStatus === 'expiring_soon').length;
    const expiredCount = documentStatuses.filter((doc) => doc.expiryStatus === 'expired').length;

    // Calculate overall status
    let overallStatus = 'incomplete';
    const missingRequiredDocs = requiredDocuments.filter((req) => !documentMap.has(req.documentType)).length;

    const unverifiedRequiredDocs = requiredDocuments.filter((req) => {
      const doc = documentMap.get(req.documentType);
      return doc && doc.status !== VehicleDocumentStatus.VERIFIED;
    }).length;

    const expiredRequiredDocs = requiredDocuments.filter((req) => {
      if (!req.hasExpiry) return false;

      const doc = documentMap.get(req.documentType);
      if (!doc || !doc.expiryDate) return false;

      return new Date(doc.expiryDate) < new Date();
    }).length;

    // Determine if all required documents are complete
    const hasCompleteDocumentation =
      missingRequiredDocs === 0 && unverifiedRequiredDocs === 0 && expiredRequiredDocs === 0;

    // Set overall status based on document state
    if (hasCompleteDocumentation) {
      overallStatus = 'complete';
    } else if (expiredRequiredDocs > 0) {
      overallStatus = 'expired';
    } else if (rejectedCount > 0) {
      overallStatus = 'rejected';
    } else if (documents.length === 0) {
      overallStatus = 'not_started';
    }

    // Return comprehensive document status information
    return {
      vehicleId: vehicleId.toString(),
      documentStatuses,
      hasCompleteDocumentation,
      overallStatus,
      stats: {
        uploadedCount: documents.length,
        requiredCount: requiredDocuments.length,
        verifiedCount,
        rejectedCount,
        expiringSoonCount,
        expiredCount,
        missingRequiredCount: missingRequiredDocs,
        unverifiedRequiredCount: unverifiedRequiredDocs,
      },
    };
  }

  async getVehicleDocumentDetails(documentId: string) {
    const document = await this.vehicleDocumentRepository.findOne(
      { _id: new Types.ObjectId(documentId) },
      {
        populate: [
          { path: 'vehicleId', select: 'make model year licensePlate' },
          { path: 'uploadedByDriverId', select: 'firstName lastName email phone' },
          { path: 'verifiedByAdminId', select: 'firstName lastName email' },
        ],
      },
    );

    if (!document) {
      throw new NotFoundException('Vehicle document not found');
    }

    return document;
  }

  async approveVehicleDocument(documentId: string, body: VehicleDocumentApprovalDto) {
    const document = await this.vehicleDocumentRepository.findOne({
      _id: new Types.ObjectId(documentId),
    });

    if (!document) {
      throw new NotFoundException('Vehicle document not found');
    }

    const updateData = {
      status: VehicleDocumentStatus.VERIFIED,
      verifiedAt: new Date(),
      // verifiedByAdminId: adminId, // Get from JWT
      verificationNotes: body.verificationNotes,
      adminNotes: body.adminNotes,
    };

    const updatedDocument = await this.vehicleDocumentRepository.findOneAndUpdate(
      { _id: new Types.ObjectId(documentId) },
      updateData,
    );

    // Update vehicle's document completion status
    await this.updateVehicleDocumentCompletionStatus(document.vehicleId);

    return updatedDocument;
  }

  async rejectVehicleDocument(documentId: string, body: VehicleDocumentApprovalDto) {
    const document = await this.vehicleDocumentRepository.findOne({
      _id: new Types.ObjectId(documentId),
    });

    if (!document) {
      throw new NotFoundException('Vehicle document not found');
    }

    const updateData = {
      status: VehicleDocumentStatus.REJECTED,
      rejectedAt: new Date(),
      rejectionReason: body.rejectionReason,
      adminNotes: body.adminNotes,
    };

    return this.vehicleDocumentRepository.findOneAndUpdate({ _id: new Types.ObjectId(documentId) }, updateData);
  }

  async getPendingVehicleDocuments(query: any) {
    const { page = 1, limit = 10, documentType } = query;
    const skip = (page - 1) * limit;

    const filter: any = { status: VehicleDocumentStatus.PENDING };
    if (documentType) filter.documentType = documentType;

    const documents = await this.vehicleDocumentRepository.findWithPagination(filter, skip, limit, {
      populate: [
        { path: 'vehicleId', select: 'make model year licensePlate' },
        { path: 'uploadedByDriverId', select: 'firstName lastName email phone' },
      ],
      sort: { createdAt: 1 }, // Oldest first
    });

    const total = await this.vehicleDocumentRepository.countDocuments(filter);

    return {
      documents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Rides Management Methods
  async getAllRides(query: GetRidesDto) {
    const { page = 1, limit = 10, status, driverId, passengerId, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (status) filter.status = status;
    if (driverId) filter.driverId = new Types.ObjectId(driverId);
    if (passengerId) filter.passengerId = new Types.ObjectId(passengerId);

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const rides = await this.rideRepository.findWithPagination(filter, skip, limit, {
      populate: [
        { path: 'driverId', select: 'firstName lastName email phone' },
        { path: 'passengerId', select: 'firstName lastName email phone' },
      ],
      sort: { createdAt: -1 },
    });

    const total = await this.rideRepository.countDocuments(filter);

    return {
      rides,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getDriverRides(driverId: string, query: any) {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;

    const filter: any = { driverId: new Types.ObjectId(driverId) };
    if (status) filter.status = status;

    const rides = await this.rideRepository.findWithPagination(filter, skip, limit, {
      populate: [{ path: 'passengerId', select: 'firstName lastName email phone' }],
      sort: { createdAt: -1 },
    });

    const total = await this.rideRepository.countDocuments(filter);

    return {
      rides,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getRideDetails(rideId: string) {
    const ride = await this.rideRepository.findOne(
      { _id: new Types.ObjectId(rideId) },
      {
        populate: [
          { path: 'driverId', select: 'firstName lastName email phone' },
          { path: 'passengerId', select: 'firstName lastName email phone' },
        ],
      },
    );

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    return ride;
  }

  // Reports Management Methods
  async getAllReports(query: GetReportsDto) {
    const { page = 1, limit = 10, status, issueType, severityLevel, assignedToMe } = query;
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (status) filter.status = status;
    if (issueType) filter.issueType = issueType;
    if (severityLevel) filter.severityLevel = severityLevel;
    // if (assignedToMe) filter.assignedToAdminId = adminId; // Get from JWT

    const reports = await this.issueReportRepository.findWithPagination(filter, skip, limit, {
      populate: [
        { path: 'reporterId', select: 'firstName lastName email phone' },
        { path: 'reportedUserId', select: 'firstName lastName email phone' },
        { path: 'rideId', select: 'rideId' },
        { path: 'assignedToAdminId', select: 'firstName lastName email' },
        { path: 'resolvedByAdminId', select: 'firstName lastName email' },
      ],
      sort: { createdAt: -1 },
    });

    const total = await this.issueReportRepository.countDocuments(filter);

    return {
      reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getReportDetails(reportId: string) {
    const report = await this.issueReportRepository.findOne(
      { _id: new Types.ObjectId(reportId) },
      {
        populate: [
          { path: 'reporterId', select: 'firstName lastName email phone' },
          { path: 'reportedUserId', select: 'firstName lastName email phone' },
          { path: 'rideId' },
          { path: 'assignedToAdminId', select: 'firstName lastName email' },
          { path: 'resolvedByAdminId', select: 'firstName lastName email' },
        ],
      },
    );

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return report;
  }

  async assignReport(reportId: string, body: AssignReportDto) {
    const report = await this.issueReportRepository.findOne({
      _id: new Types.ObjectId(reportId),
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const updateData = {
      assignedToAdminId: new Types.ObjectId(body.assignedToAdminId),
      assignedAt: new Date(),
      adminNotes: body.adminNotes,
    };

    return this.issueReportRepository.findOneAndUpdate({ _id: new Types.ObjectId(reportId) }, updateData);
  }

  async resolveReport(reportId: string, body: ResolveReportDto) {
    const report = await this.issueReportRepository.findOne({
      _id: new Types.ObjectId(reportId),
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const updateData = {
      status: 'RESOLVED',
      resolutionDetails: body.resolutionDetails,
      resolvedAt: new Date(),
      // resolvedByAdminId: adminId, // Get from JWT
      adminNotes: body.adminNotes,
      requiresFollowUp: body.requiresFollowUp || false,
      followUpDate: body.followUpDate ? new Date(body.followUpDate) : null,
    };

    return this.issueReportRepository.findOneAndUpdate({ _id: new Types.ObjectId(reportId) }, updateData);
  }

  // Dashboard Methods
  async getDashboardStats() {
    const [
      totalDrivers,
      activeDrivers,
      verifiedDrivers,
      pendingDocuments,
      pendingVehicleDocuments,
      openReports,
      todayRides,
    ] = await Promise.all([
      this.userRepository.countDocuments({ type: Role.DRIVER }),
      this.userRepository.countDocuments({ type: Role.DRIVER, isActive: true }),
      this.userRepository.countDocuments({ type: Role.DRIVER, isDriverVerified: true }),
      this.driverDocumentRepository.countDocuments({ status: DocumentStatus.PENDING }),
      this.vehicleDocumentRepository.countDocuments({ status: VehicleDocumentStatus.PENDING }),
      this.issueReportRepository.countDocuments({ status: 'OPEN' }),
      this.rideRepository.countDocuments({
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      }),
    ]);

    return {
      totalDrivers,
      activeDrivers,
      verifiedDrivers,
      pendingDocuments,
      pendingVehicleDocuments,
      openReports,
      todayRides,
    };
  }

  async getPendingTasks() {
    const [pendingDriverDocuments, pendingVehicleDocuments, unassignedReports, urgentReports] = await Promise.all([
      this.driverDocumentRepository.countDocuments({ status: DocumentStatus.PENDING }),
      this.vehicleDocumentRepository.countDocuments({ status: VehicleDocumentStatus.PENDING }),
      this.issueReportRepository.countDocuments({ status: 'OPEN', assignedToAdminId: null }),
      this.issueReportRepository.countDocuments({
        status: 'OPEN',
        severityLevel: { $gte: 4 },
      }),
    ]);

    return {
      pendingDriverDocuments,
      pendingVehicleDocuments,
      unassignedReports,
      urgentReports,
    };
  }

  // Helper Methods
  private async calculateDriverStatistics(driverId: string) {
    const driverObjectId = new Types.ObjectId(driverId);

    const totalRides = await this.rideRepository.countDocuments({ driverId: driverObjectId });
    const completedRides = await this.rideRepository.countDocuments({
      driverId: driverObjectId,
      status: RideStatus.RIDE_COMPLETED,
    });
    const cancelledRides = await this.rideRepository.countDocuments({
      driverId: driverObjectId,
      status: RideStatus.RIDE_CANCELLED,
    });

    // Calculate average rating
    const ratingResult = await this.ratingModel.aggregate([
      {
        $match: {
          ratedUserId: driverObjectId,
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$overallRating' },
          totalRatings: { $sum: 1 },
        },
      },
    ]);

    const averageRating =
      ratingResult.length > 0 && ratingResult[0].totalRatings > 0
        ? Math.round((ratingResult[0].averageRating || 0) * 10) / 10 // Round to 1 decimal place
        : 0;

    // Calculate total earnings from wallet transactions
    // Get wallet for driver
    const wallet = await this.walletRepository.findOne({ user: driverObjectId });
    if (!wallet) {
      return {
        totalRides,
        completedRides,
        cancelledRides,
        averageRating,
        totalEarnings: 0,
      };
    }

    const walletId = typeof wallet._id === 'string' ? new Types.ObjectId(wallet._id) : wallet._id;

    // Calculate total earnings from CREDIT transactions with category RIDE and status COMPLETED
    const earningsResult = await this.transactionModel.aggregate([
      {
        $match: {
          user: driverObjectId,
          wallet: walletId,
          type: TransactionType.CREDIT,
          category: TransactionCategory.RIDE,
          status: TransactionStatus.COMPLETED,
        },
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$amount' },
        },
      },
    ]);

    const totalEarnings = earningsResult.length > 0 ? earningsResult[0].totalEarnings || 0 : 0;

    return {
      totalRides,
      completedRides,
      cancelledRides,
      averageRating,
      totalEarnings,
    };
  }

  private async getDriverWalletBalance(driverId: Types.ObjectId): Promise<{
    balance: number;
    availableBalance: number;
    currencySymbol: string;
    currency: string;
  }> {
    try {
      // Get wallet for driver
      const wallet = await this.walletRepository.findOne({ user: driverId });
      if (!wallet) {
        return {
          balance: 0,
          availableBalance: 0,
          currencySymbol: 'RM',
          currency: 'MYR',
        };
      }

      const walletId = typeof wallet._id === 'string' ? new Types.ObjectId(wallet._id) : wallet._id;

      // Calculate balance from COMPLETED transactions only
      const completedBalanceResult = await this.transactionModel.aggregate([
        {
          $match: {
            user: driverId,
            wallet: walletId,
            balanceType: { $in: [BalanceType.DEPOSIT, BalanceType.WITHDRAWABLE] },
            status: TransactionStatus.COMPLETED,
          },
        },
        {
          $group: {
            _id: null,
            totalCredits: {
              $sum: {
                $cond: [{ $eq: ['$type', `${TransactionType.CREDIT}`] }, '$amount', 0],
              },
            },
            totalDebits: {
              $sum: {
                $cond: [{ $eq: ['$type', `${TransactionType.DEBIT}`] }, '$amount', 0],
              },
            },
          },
        },
        {
          $project: {
            balance: { $subtract: ['$totalCredits', '$totalDebits'] },
          },
        },
      ]);

      // Calculate balance from both COMPLETED and PENDING transactions
      const allBalanceResult = await this.transactionModel.aggregate([
        {
          $match: {
            user: driverId,
            wallet: walletId,
            balanceType: { $in: [BalanceType.DEPOSIT, BalanceType.WITHDRAWABLE] },
            status: { $in: [TransactionStatus.COMPLETED, TransactionStatus.PENDING] },
          },
        },
        {
          $group: {
            _id: null,
            totalCredits: {
              $sum: {
                $cond: [{ $eq: ['$type', `${TransactionType.CREDIT}`] }, '$amount', 0],
              },
            },
            totalDebits: {
              $sum: {
                $cond: [{ $eq: ['$type', `${TransactionType.DEBIT}`] }, '$amount', 0],
              },
            },
          },
        },
        {
          $project: {
            balance: { $subtract: ['$totalCredits', '$totalDebits'] },
          },
        },
      ]);

      const completedBalance = completedBalanceResult.length > 0 ? completedBalanceResult[0].balance : 0;
      const availableBalance = allBalanceResult.length > 0 ? allBalanceResult[0].balance : 0;

      return {
        balance: Math.max(0, completedBalance),
        availableBalance: Math.max(0, availableBalance),
        currencySymbol: wallet.currencySymbol || 'RM',
        currency: wallet.currency || 'MYR',
      };
    } catch (error) {
      return {
        balance: 0,
        availableBalance: 0,
        currencySymbol: 'RM',
        currency: 'MYR',
      };
    }
  }

  private async updateDriverDocumentCompletionStatus(driverId: Types.ObjectId) {
    // Get all driver documents
    const driverDocs = await this.driverDocumentRepository.find({
      driverId,
      isActive: true,
    });

    // Get required document types
    const requiredDocTypes = this.DOCUMENT_REQUIREMENTS.filter((req) => req.isRequired).map((req) => req.documentType);

    // Create a map of document types to their details
    const driverDocMap = new Map();
    driverDocs.forEach((doc) => {
      driverDocMap.set(doc.documentType, {
        isVerified: doc.status === DocumentStatus.VERIFIED,
        expiryDate: doc.expiryDate,
        status: doc.status,
        document: doc,
      });
    });

    // Check for missing documents
    const missingDocs = requiredDocTypes.filter((docType) => !driverDocMap.has(docType));

    // Check for unverified documents
    const unverifiedDocs = requiredDocTypes.filter(
      (docType) => driverDocMap.has(docType) && !driverDocMap.get(docType).isVerified,
    );

    // Check for expired documents
    const expiredDocs = requiredDocTypes.filter((docType) => {
      const requirement = this.DOCUMENT_REQUIREMENTS.find((req) => req.documentType === docType);
      if (!requirement || !requirement.hasExpiry) return false;

      const doc = driverDocMap.get(docType);
      if (!doc || !doc.expiryDate) return false;

      return new Date(doc.expiryDate) < new Date();
    });

    // Determine if all required documents are complete
    const hasCompleteDocumentation =
      missingDocs.length === 0 && unverifiedDocs.length === 0 && expiredDocs.length === 0;

    // Update driver's hasCompleteDocumentation field
    await this.userRepository.findOneAndUpdate(
      { _id: driverId },
      {
        hasCompleteDocumentation,
        isDriverVerified: hasCompleteDocumentation ? true : false,
        lastDocumentVerificationCheck: new Date(),
      },
    );
  }

  private async updateVehicleDocumentCompletionStatus(vehicleId: Types.ObjectId) {
    // Get all vehicle documents
    const vehicleDocs = await this.vehicleDocumentRepository.find({
      vehicleId,
      isActive: true,
    });

    // Get required document types
    const requiredDocTypes = this.VEHICLE_DOCUMENT_REQUIREMENTS.filter((req) => req.isRequired).map(
      (req) => req.documentType,
    );

    // Create a map of document types to their details
    const vehicleDocMap = new Map();
    vehicleDocs.forEach((doc) => {
      vehicleDocMap.set(doc.documentType, {
        isVerified: doc.status === VehicleDocumentStatus.VERIFIED,
        expiryDate: doc.expiryDate,
        status: doc.status,
        document: doc,
      });
    });

    // Check for missing documents
    const missingDocs = requiredDocTypes.filter((docType) => !vehicleDocMap.has(docType));

    // Check for unverified documents
    const unverifiedDocs = requiredDocTypes.filter(
      (docType) => vehicleDocMap.has(docType) && !vehicleDocMap.get(docType).isVerified,
    );

    // Determine if all required documents are complete
    const hasCompleteDocumentation = missingDocs.length === 0 && unverifiedDocs.length === 0;

    // If documentation is complete, automatically set EVP price and period from settings
    let updateData: any = {
      hasCompleteDocumentation,
      lastDocumentVerificationCheck: new Date(),
    };

    if (hasCompleteDocumentation) {
      // Check if vehicle already has an active EVP
      const existingActiveEvp = await this.driverEvpRepository.findOne({
        vehicleId: vehicleId,
        isActive: true,
        endDate: { $gt: new Date() }, // Not expired
        revokedAt: { $exists: false }, // Not revoked
      });

      // Only set EVP price if there's no active EVP
      if (!existingActiveEvp) {
        // Get global EVP price and period from settings
        try {
          const settings = await this.settingsModel.findOne().exec();
          if (settings && settings.globalVehicleEvpPrice && settings.globalVehicleEvpPrice > 0) {
            updateData.evpPrice = settings.globalVehicleEvpPrice;
            updateData.evpPriceSet = true;

            // Set EVP period if available in settings
            if (settings.globalVehicleEvpPeriod && settings.globalVehicleEvpPeriod > 0) {
              updateData.evpPeriod = settings.globalVehicleEvpPeriod;
            }
          }
        } catch (error) {
          // If settings are not available, skip auto-setting EVP price
          console.error('Failed to get global EVP price from settings:', error);
        }
      }
    }

    // Update vehicle's hasCompleteDocumentation field and EVP price/period if applicable
    await this.vehicleRepository.findOneAndUpdate({ _id: vehicleId }, updateData);
  }

  async setVehicleEvpForPayment(vehicleId: Types.ObjectId | string) {
    try {
      const vehicle = await this.vehicleRepository.findById(vehicleId);
      if (!vehicle) {
        throw new NotFoundException('Vehicle not found');
      }

      if (!vehicle.hasCompleteDocumentation) {
        throw new BadRequestException('Vehicle has no complete documentation');
      }
      const existingActiveEvp = await this.driverEvpRepository.findOne({
        vehicleId: vehicleId,
        isActive: true,
        endDate: { $gt: new Date() }, // Not expired
        revokedAt: { $exists: false }, // Not revoked
      });

      if (existingActiveEvp) {
        throw new BadRequestException('Vehicle already has an active EVP');
      }
      let updateData: any = {
        // hasCompleteDocumentation,
        lastDocumentVerificationCheck: new Date(),
      };
      if (!existingActiveEvp) {
        // Get global EVP price and period from settings
        try {
          const settings = await this.settingsModel.findOne().exec();
          if (settings && settings.globalVehicleEvpPrice && settings.globalVehicleEvpPrice > 0) {
            updateData.evpPrice = settings.globalVehicleEvpPrice;
            updateData.evpPriceSet = true;

            // Set EVP period if available in settings
            if (settings.globalVehicleEvpPeriod && settings.globalVehicleEvpPeriod > 0) {
              updateData.evpPeriod = settings.globalVehicleEvpPeriod;
            }
          }
        } catch (error) {
          // If settings are not available, skip auto-setting EVP price
          console.error('Failed to get global EVP price from settings:', error);
        }
      }
      await this.vehicleRepository.findOneAndUpdate({ _id: vehicleId }, updateData);
      return {
        success: true,
        message: 'EVP set for payment',
        // data: dd,
      };
    } catch (error) {
      throw error;
    }
    // return this.mapToVehicleEvpResponseDto(dd);
  }

  private readonly DOCUMENT_REQUIREMENTS: any[] = [
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
  private readonly VEHICLE_DOCUMENT_REQUIREMENTS: any[] = [
    {
      documentType: VehicleDocumentType.CAR_INSURANCE,
      isRequired: true,
      displayName: 'Car Insurance',
      hasExpiry: false,
    },
    {
      documentType: VehicleDocumentType.CAR_RENTAL_AGREEMENT,
      isRequired: false,
      displayName: 'Car Rental Agreement',
      hasExpiry: true,
    },
    {
      documentType: VehicleDocumentType.PUSPAKOM_INSPECTION,
      isRequired: true,
      displayName: 'Puspakom Inspection',
      hasExpiry: true,
    },
    {
      documentType: VehicleDocumentType.TAXI_PERMIT_VEHICLE,
      isRequired: true,
      displayName: 'Taxi Permit Vehicle',
      hasExpiry: true,
    },
    {
      documentType: VehicleDocumentType.AUTHORIZATION_LETTER,
      isRequired: false,
      displayName: 'Authorization Letter',
      hasExpiry: true,
    },
  ];
  // // EVP Management Methods
  // async createDriverEvp(createDriverEvpDto: CreateDriverEvpDto, adminId: string): Promise<DriverEvpResponseDto> {
  //   const { driverId, certificateNumber, startDate, endDate, documentUrl, notes } = createDriverEvpDto;

  //   // Check if driver exists
  //   const driver = await this.userRepository.findOne({ _id: new Types.ObjectId(driverId), type: Role.DRIVER });
  //   if (!driver) {
  //     throw new NotFoundException(`Driver with ID ${driverId} not found`);
  //   }

  //   // Get all driver documents
  //   const driverDocs = await this.driverDocumentRepository.find({
  //     driverId: new Types.ObjectId(driverId),
  //     isActive: true,
  //   });

  //   // Check if driver has any documents
  //   if (driverDocs.length === 0) {
  //     throw new BadRequestException('Driver has no documents uploaded');
  //   }

  //   // Check if all required document types have been uploaded and verified
  //   const requiredDocTypes = this.DOCUMENT_REQUIREMENTS.filter((req) => req.isRequired).map((req) => req.documentType);

  //   // Create a map of document types to their details
  //   const driverDocMap = new Map();
  //   driverDocs.forEach((doc) => {
  //     driverDocMap.set(doc.documentType, {
  //       isVerified: doc.status === DocumentStatus.VERIFIED,
  //       expiryDate: doc.expiryDate,
  //       status: doc.status,
  //       document: doc,
  //     });
  //   });

  //   // Check for missing documents
  //   const missingDocs = requiredDocTypes.filter((docType) => !driverDocMap.has(docType));
  //   if (missingDocs.length > 0) {
  //     const missingDocNames = missingDocs.map((docType) => {
  //       const docReq = this.DOCUMENT_REQUIREMENTS.find((req) => req.documentType === docType);
  //       return docReq ? docReq.displayName : docType;
  //     });
  //     throw new BadRequestException(`Required documents are missing: ${missingDocNames.join(', ')}`);
  //   }

  //   // Check for unverified documents
  //   const unverifiedDocs = requiredDocTypes.filter(
  //     (docType) => driverDocMap.has(docType) && !driverDocMap.get(docType).isVerified,
  //   );

  //   if (unverifiedDocs.length > 0) {
  //     const unverifiedDocNames = unverifiedDocs.map((docType) => {
  //       const docReq = this.DOCUMENT_REQUIREMENTS.find((req) => req.documentType === docType);
  //       return docReq ? docReq.displayName : docType;
  //     });
  //     throw new BadRequestException(`These documents are not verified: ${unverifiedDocNames.join(', ')}`);
  //   }

  //   // Check for expired documents that have expiry dates
  //   // const now = new Date();
  //   // const expiredDocs = requiredDocTypes.filter((docType) => {
  //   //   const doc = driverDocMap.get(docType);
  //   //   const docReq = this.DOCUMENT_REQUIREMENTS.find((req) => req.documentType === docType);

  //   //   // Only check documents with expiry dates
  //   //   if (docReq && docReq.hasExpiry && doc && doc.expiryDate) {
  //   //     return new Date(doc.expiryDate) < now;
  //   //   }
  //   //   return false;
  //   // });

  //   // if (expiredDocs.length > 0) {
  //   //   const expiredDocNames = expiredDocs.map((docType) => {
  //   //     const docReq = this.DOCUMENT_REQUIREMENTS.find((req) => req.documentType === docType);
  //   //     const doc = driverDocMap.get(docType);
  //   //     const expiryDate = doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : 'unknown';
  //   //     return `${docReq ? docReq.displayName : docType} (expired on ${expiryDate})`;
  //   //   });
  //   //   throw new BadRequestException(`These documents are expired: ${expiredDocNames.join(', ')}`);
  //   // }

  //   // Check if there's already an active EVP
  //   const existingActiveEvp = await this.driverEvpRepository.findOne({
  //     driverId: new Types.ObjectId(driverId),
  //     isActive: true,
  //     endDate: { $gt: new Date() },
  //     revokedAt: { $exists: false },
  //   });

  //   if (existingActiveEvp) {
  //     throw new BadRequestException('Driver already has an active EVP');
  //   }

  //   // Validate dates
  //   const start = new Date(startDate);
  //   const end = new Date(endDate);

  //   if (start >= end) {
  //     throw new BadRequestException('End date must be after start date');
  //   }

  //   if (start < new Date()) {
  //     throw new BadRequestException('Start date cannot be in the past');
  //   }

  //   // Create new EVP
  //   const evp = await this.driverEvpRepository.create({
  //     _id: new Types.ObjectId(),
  //     driverId: new Types.ObjectId(driverId),
  //     certificateNumber,
  //     startDate: start,
  //     endDate: end,
  //     documentUrl,
  //     notes,
  //     isActive: true,
  //     issuedBy: new Types.ObjectId(adminId),
  //   });

  //   return this.mapToEvpResponseDto(evp);
  // }

  // async getDriverEvps(
  //   driverId: string,
  //   query: GetDriverEvpsDto,
  // ): Promise<{ evps: DriverEvpResponseDto[]; total: number; page: number; limit: number }> {
  //   const { page = 1, limit = 10, activeOnly = false } = query;

  //   // Check if driver exists
  //   const driver = await this.userRepository.findOne({ _id: new Types.ObjectId(driverId), type: Role.DRIVER });
  //   if (!driver) {
  //     throw new NotFoundException(`Driver with ID ${driverId} not found`);
  //   }

  //   const { evps, total } = await this.driverEvpRepository.findDriverEvps(driverId, page, limit, activeOnly);

  //   return {
  //     evps: evps.map((evp) => this.mapToEvpResponseDto(evp)),
  //     total,
  //     page,
  //     limit,
  //   };
  // }

  async getEvpById(evpId: string): Promise<DriverEvpResponseDto> {
    const evp = await this.driverEvpRepository.findById(evpId);

    if (!evp) {
      throw new NotFoundException(`EVP with ID ${evpId} not found`);
    }

    return this.mapToEvpResponseDto(evp);
  }

  async revokeEvp(evpId: string, revokeDto: RevokeDriverEvpDto, adminId: string): Promise<VehicleEvpResponseDto> {
    // Find the EVP (now linked to vehicle)
    const evp = await this.driverEvpRepository.findById(evpId);

    if (!evp) {
      throw new NotFoundException(`EVP with ID ${evpId} not found`);
    }

    if (!evp.isActive) {
      throw new BadRequestException('EVP is already inactive or revoked');
    }

    // Revoke the EVP
    const updatedEvp = await this.driverEvpRepository.findOneAndUpdate(
      { _id: new Types.ObjectId(evpId) },
      {
        isActive: false,
        revokedAt: new Date(),
        revokedBy: new Types.ObjectId(adminId),
        notes: evp.notes ? `${evp.notes}\n\nRevoked: ${revokeDto.reason}` : `Revoked: ${revokeDto.reason}`,
      },
    );

    let updateData: any = {};
    try {
      const settings = await this.settingsModel.findOne().exec();
      if (settings && settings.globalVehicleEvpPrice && settings.globalVehicleEvpPrice > 0) {
        updateData.evpPrice = settings.globalVehicleEvpPrice;
        updateData.evpPriceSet = true;
        // Set EVP period if available in settings
        if (settings.globalVehicleEvpPeriod && settings.globalVehicleEvpPeriod > 0) {
          updateData.evpPeriod = settings.globalVehicleEvpPeriod;
        }
      }
      await this.vehicleRepository.findOneAndUpdate({ _id: evp.vehicleId.toString() }, updateData);
    } catch (error) {
      // If settings are not available, skip auto-setting EVP price
      console.error('Failed to get global EVP price from settings:', error);
    }

    return this.mapToVehicleEvpResponseDto(updatedEvp);
  }

  private mapToEvpResponseDto(evp: any): DriverEvpResponseDto {
    return {
      _id: evp._id.toString(),
      driverId: evp.driverId.toString(),
      certificateNumber: evp.certificateNumber,
      startDate: evp.startDate,
      endDate: evp.endDate,
      documentUrl: evp.documentUrl,
      isActive: evp.isActive,
      notes: evp.notes,
      issuedBy: evp.issuedBy.toString(),
      revokedAt: evp.revokedAt,
      revokedBy: evp.revokedBy ? evp.revokedBy.toString() : undefined,
      createdAt: evp.createdAt,
      updatedAt: evp.updatedAt,
    };
  }

  async createVehicleEvp(createVehicleEvpDto: CreateVehicleEvpDto, adminId: string): Promise<VehicleEvpResponseDto> {
    const { vehicleId, transactionId, certificateNumber, startDate, endDate, documentUrl, notes } = createVehicleEvpDto;

    // Check if vehicle exists
    const vehicle = await this.vehicleRepository.findById(vehicleId);
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${vehicleId} not found`);
    }

    // Check if all vehicle documents are verified
    if (!vehicle.hasCompleteDocumentation) {
      throw new BadRequestException('All vehicle documents must be verified before generating EVP');
    }

    // Check if EVP payment has been completed
    // Check for a completed EVP_PAYMENT transaction for this vehicle
    const completedPayment = await this.transactionModel.findOne({
      _id: new Types.ObjectId(transactionId),
      category: TransactionCategory.EVP_PAYMENT,
      status: TransactionStatus.COMPLETED,
      'metadata.vehicleId': vehicleId,
      'metadata.vehicleEvpId': { $exists: false },
      // No need for any condition here to get the latest, we will just sort below.
    });

    if (!completedPayment) {
      throw new BadRequestException(
        'EVP Transaction payment has not been completed yet, or already used to generate EVP',
      );
    }

    // Check if there's already an active EVP for this vehicle
    const existingActiveEvp = await this.driverEvpRepository.findOne({
      vehicleId: new Types.ObjectId(vehicleId),
      isActive: true,
      endDate: { $gt: new Date() },
      revokedAt: { $exists: false },
    });

    if (existingActiveEvp) {
      throw new BadRequestException('Vehicle already has an active EVP');
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      throw new BadRequestException('End date must be after start date');
    }

    // Allow start date from today onwards (compare dates without time)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDateOnly = new Date(start);
    startDateOnly.setHours(0, 0, 0, 0);

    if (startDateOnly < today) {
      throw new BadRequestException('Start date cannot be in the past. It must be from today onwards');
    }

    // Create new Vehicle EVP (using the same repository since we updated the schema)
    const evp = await this.driverEvpRepository.create({
      _id: new Types.ObjectId(),
      vehicleId: new Types.ObjectId(vehicleId),
      price: completedPayment.amount,
      transactionId: completedPayment._id,
      certificateNumber,
      startDate: start,
      endDate: end,
      documentUrl,
      notes,
      isActive: true,
      issuedBy: new Types.ObjectId(adminId),
    });
    await this.transactionModel.findOneAndUpdate(
      {
        category: TransactionCategory.EVP_PAYMENT,
        status: TransactionStatus.COMPLETED,
        'metadata.vehicleId': vehicleId,
        // No need for any condition here to get the latest, we will just sort below.
      },
      { 'metadata.vehicleEvpId': evp._id.toString() },
    );
    await this.vehicleRepository.findOneAndUpdate(
      { _id: new Types.ObjectId(vehicleId) },
      { evpAdminGeneratedPending: false, evpPriceSet: false },
    );

    return this.mapToVehicleEvpResponseDto(evp);
  }

  async getVehicleEvps(vehicleId: string): Promise<VehicleEvpResponseDto[]> {
    const vehicle = await this.vehicleRepository.findById(vehicleId);
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${vehicleId} not found`);
    }

    const evps = await this.driverEvpRepository.find({
      vehicleId: new Types.ObjectId(vehicleId),
    });

    return evps.map((evp) => this.mapToVehicleEvpResponseDto(evp));
  }

  async getVehicleEvpTransactions(
    vehicleId: string,
    query: { page?: number; limit?: number; startDate?: string; endDate?: string; status?: string },
  ) {
    // Check if vehicle exists
    const vehicle = await this.vehicleRepository.findById(vehicleId);
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${vehicleId} not found`);
    }

    const { page = 1, limit = 10, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    // Build filter for EVP transactions for this specific vehicle
    const filter: any = {
      category: TransactionCategory.EVP_PAYMENT,
      'metadata.vehicleId': vehicleId,
      status: TransactionStatus.COMPLETED,
    };

    // Date filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        // Set end date to end of day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // Get total count
    const total = await this.transactionModel.countDocuments(filter);

    // Get transactions with pagination
    const transactions = await this.transactionModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    // Get unique driver IDs for batch fetching
    const driverIds = [...new Set(transactions.map((t) => (t.user ? t.user.toString() : null)).filter(Boolean))];

    // Fetch all drivers in batch
    const drivers = await this.userModel
      .find({ _id: { $in: driverIds.map((id) => new Types.ObjectId(id)) } })
      .select('_id fullName')
      .lean()
      .exec();

    // Create map for quick lookup
    const driverMap = new Map(drivers.map((d) => [d._id.toString(), d.fullName || 'Unknown']));

    // Get all transaction IDs to fetch EVPs in batch
    const transactionIds = transactions.map((t) => new Types.ObjectId(t._id.toString()));

    // Fetch all EVPs for these transactions in a single query
    const vehicleEvps = await this.driverEvpRepository.find({
      transactionId: { $in: transactionIds },
    });

    // Create map for quick lookup: transactionId -> EVP
    const evpMap = new Map<string, VehicleEvpResponseDto>();
    vehicleEvps.forEach((evp) => {
      if (evp.transactionId) {
        evpMap.set(evp.transactionId.toString(), this.mapToVehicleEvpResponseDto(evp));
      }
    });

    // Enrich transactions with driver names and EVP data
    const enrichedTransactions = transactions.map((transaction) => {
      const driverId = transaction.user ? transaction.user.toString() : null;
      const transactionIdStr = transaction._id.toString();
      const vehicleEvp = evpMap.get(transactionIdStr) || null;

      return {
        _id: transactionIdStr,
        transactionRef: transaction.transactionRef,
        driverName: driverId ? driverMap.get(driverId) || 'Unknown' : 'Unknown',
        amount: transaction.amount,
        paymentMethod: transaction.paymentMethod || 'N/A',
        status: transaction.status,
        date: transaction.createdAt,
        vehicleId: transaction.metadata?.vehicleId?.toString(),
        vehicleEvp: vehicleEvp,
      };
    });

    return {
      transactions: enrichedTransactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private mapToVehicleEvpResponseDto(evp: any): VehicleEvpResponseDto {
    return {
      _id: evp._id.toString(),
      vehicleId: evp.vehicleId.toString(),
      transactionId: evp.transactionId?.toString(),
      certificateNumber: evp.certificateNumber,
      startDate: evp.startDate,
      endDate: evp.endDate,
      documentUrl: evp.documentUrl,
      isActive: evp.isActive,
      notes: evp.notes,
      issuedBy: evp.issuedBy.toString(),
      revokedAt: evp.revokedAt,
      revokedBy: evp.revokedBy ? evp.revokedBy.toString() : undefined,
      createdAt: evp.createdAt,
      updatedAt: evp.updatedAt,
    };
  }

  // Get EVP Eligible Drivers
  async getEvpEligibleDrivers(query: GetEvpEligibleDriversDto) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    // Base filter for drivers: verified and have complete documentation
    const driverFilter: any = {
      type: Role.DRIVER,
      isDriverVerified: true,
      hasCompleteDocumentation: true,
    };

    // Add search filter if provided
    if (search) {
      driverFilter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    // Get all eligible drivers first
    const allEligibleDrivers = await this.userRepository.find(driverFilter);

    // Get driver IDs
    const driverIds = allEligibleDrivers.map((driver) => driver._id);

    // Find vehicles that belong to these drivers and have complete documentation
    const eligibleVehicles = await this.vehicleRepository.find(
      {
        driverId: { $in: driverIds },
        hasCompleteDocumentation: true,
        // isActive: true,
      },
      {
        select: 'driverId',
      },
    );

    // Get unique driver IDs that have at least one eligible vehicle
    const eligibleDriverIds = [...new Set(eligibleVehicles.map((v) => v.driverId.toString()))];

    if (eligibleDriverIds.length === 0) {
      return {
        drivers: [],
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0,
        },
      };
    }

    // Filter drivers to only those with eligible vehicles
    const finalFilter = {
      ...driverFilter,
      _id: { $in: eligibleDriverIds.map((id) => new Types.ObjectId(id)) },
    };

    // Get paginated results - exclude sensitive fields
    const drivers = await this.userRepository.findWithPagination(finalFilter, skip, limit, {
      populate: [{ path: 'driverVerifiedByAdminId', select: 'firstName lastName email' }],
      sort: { createdAt: -1 },
      select:
        '-passwordHash -passwordSalt -fcmToken -emailConfirmationCode -phoneConfirmationCode -resetPasswordOtp -resetPasswordOtpExpiry -resetPasswordCount -loginFailedCount -lastLoginDate -isFirstTime',
    });

    // Get vehicles for each driver
    const driversWithVehicles = await Promise.all(
      drivers.map(async (driver) => {
        const vehicles = await this.vehicleRepository.find(
          {
            driverId: driver._id,
            hasCompleteDocumentation: true,
            // isActive: true,
          },
          {
            populate: [{ path: 'verifiedByAdminId', select: 'firstName lastName email' }],
            sort: { isPrimary: -1, createdAt: -1 },
          },
        );

        // Convert to object and remove any remaining sensitive fields
        const driverObj = driver.toObject();
        delete driverObj.passwordHash;
        delete driverObj.passwordSalt;
        delete driverObj.fcmToken;
        delete driverObj.emailConfirmationCode;
        delete driverObj.phoneConfirmationCode;
        delete driverObj.resetPasswordOtp;
        delete driverObj.resetPasswordOtpExpiry;
        delete driverObj.resetPasswordCount;
        delete driverObj.loginFailedCount;
        delete driverObj.lastLoginDate;
        delete driverObj.isFirstTime;

        return {
          ...driverObj,
          eligibleVehicles: vehicles,
        };
      }),
    );

    const total = eligibleDriverIds.length;

    return {
      drivers: driversWithVehicles,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
