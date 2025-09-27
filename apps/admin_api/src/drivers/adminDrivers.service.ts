import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { DocumentStatus, VehicleStatus, VehicleDocumentStatus, Role } from '@urcab-workspace/shared';
import {
  GetDriversDto,
  DocumentApprovalDto,
  VehicleApprovalDto,
  VehicleDocumentApprovalDto,
  GetRidesDto,
  GetReportsDto,
  AssignReportDto,
  ResolveReportDto,
} from './dto';
import {
  AdminDriverDocumentRepository,
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

    // Get driver documents
    const documents = await this.driverDocumentRepository.find(
      { driverId: new Types.ObjectId(driverId) },
      {
        populate: [{ path: 'verifiedByAdminId', select: 'firstName lastName email' }],
        sort: { createdAt: -1 },
      },
    );

    // Get driver vehicles
    const vehicles = await this.vehicleRepository.find(
      { driverId: new Types.ObjectId(driverId) },
      {
        populate: [{ path: 'verifiedByAdminId', select: 'firstName lastName email' }],
        sort: { createdAt: -1 },
      },
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

    return {
      driver,
      documents,
      vehicles,
      recentRides,
      statistics,
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
    return this.driverDocumentRepository.find(
      { driverId: new Types.ObjectId(driverId) },
      {
        populate: [{ path: 'verifiedByAdminId', select: 'firstName lastName email' }],
        sort: { createdAt: -1 },
      },
    );
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

    return this.driverDocumentRepository.findOneAndUpdate({ _id: new Types.ObjectId(documentId) }, updateData);
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

    // Get vehicle documents
    const documents = await this.vehicleDocumentRepository.find(
      { vehicleId: new Types.ObjectId(vehicleId) },
      {
        populate: [{ path: 'verifiedByAdminId', select: 'firstName lastName email' }],
        sort: { createdAt: -1 },
      },
    );

    return {
      vehicle,
      documents,
    };
  }

  async approveVehicle(vehicleId: string, body: VehicleApprovalDto) {
    const vehicle = await this.vehicleRepository.findOne({
      _id: new Types.ObjectId(vehicleId),
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    const updateData = {
      status: VehicleStatus.VERIFIED,
      verifiedAt: new Date(),
      // verifiedByAdminId: adminId, // Get from JWT
      verificationNotes: body.verificationNotes,
    };

    return this.vehicleRepository.findOneAndUpdate({ _id: new Types.ObjectId(vehicleId) }, updateData);
  }

  async rejectVehicle(vehicleId: string, body: VehicleApprovalDto) {
    const vehicle = await this.vehicleRepository.findOne({
      _id: new Types.ObjectId(vehicleId),
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    const updateData = {
      status: VehicleStatus.REJECTED,
      rejectionReason: body.rejectionReason,
    };

    return this.vehicleRepository.findOneAndUpdate({ _id: new Types.ObjectId(vehicleId) }, updateData);
  }

  // Vehicle Documents Methods
  async getVehicleDocuments(vehicleId: string) {
    return this.vehicleDocumentRepository.find(
      { vehicleId: new Types.ObjectId(vehicleId) },
      {
        populate: [{ path: 'verifiedByAdminId', select: 'firstName lastName email' }],
        sort: { createdAt: -1 },
      },
    );
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
      status: 'COMPLETED',
    });
    const cancelledRides = await this.rideRepository.countDocuments({
      driverId: driverObjectId,
      status: 'CANCELLED',
    });

    // You might need to implement rating and earnings calculation based on your schema
    const averageRating = 0; // Implement based on your rating system
    const totalEarnings = 0; // Implement based on your earnings system

    return {
      totalRides,
      completedRides,
      cancelledRides,
      averageRating,
      totalEarnings,
    };
  }

  private async updateDriverDocumentCompletionStatus(driverId: Types.ObjectId) {
    // Implement logic to check if all required documents are approved
    // and update driver's hasCompleteDocumentation field
  }

  private async updateVehicleDocumentCompletionStatus(vehicleId: Types.ObjectId) {
    // Implement logic to check if all required vehicle documents are approved
    // and update vehicle's hasCompleteDocumentation field
  }
}
