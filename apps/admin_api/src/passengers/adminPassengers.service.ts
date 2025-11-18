import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { Role } from '@urcab-workspace/shared';
import { GetPassengersDto, GetPassengerRidesDto, GetPassengerReportsDto } from './dto';
import {
  AdminPassengerUserRepository,
  AdminPassengerRideRepository,
  AdminPassengerDocumentRepository,
  AdminPassengerRatingRepository,
  AdminPassengerReportRepository,
} from './repository';

@Injectable()
export class AdminPassengersService {
  constructor(
    private readonly passengerUserRepository: AdminPassengerUserRepository,
    private readonly passengerRideRepository: AdminPassengerRideRepository,
    private readonly passengerDocumentRepository: AdminPassengerDocumentRepository,
    private readonly passengerRatingRepository: AdminPassengerRatingRepository,
    private readonly passengerReportRepository: AdminPassengerReportRepository,
  ) {}

  // Passenger Management Methods
  async getAllPassengers(query: GetPassengersDto) {
    const { page = 1, limit = 10, search, status, isVerified } = query;
    const skip = (page - 1) * limit;

    const filter: any = { type: Role.PASSENGER };

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
    if (isVerified !== undefined) filter.isVerified = isVerified;

    const [passengers, totalCount] = await Promise.all([
      this.passengerUserRepository.findWithPagination(filter, skip, limit, {
        sort: { createdAt: -1 },
        select: '-password',
      }),
      this.passengerUserRepository.countDocuments(filter),
    ]);

    return {
      data: passengers,
      meta: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async getPassengerDetails(passengerId: string) {
    try {
      // Validate ID format
      if (!Types.ObjectId.isValid(passengerId)) {
        throw new BadRequestException('Invalid passenger ID format');
      }

      const passengerObjectId = new Types.ObjectId(passengerId);

      // Get passenger details
      const passenger = await this.passengerUserRepository.findOne(
        { _id: passengerObjectId, type: Role.PASSENGER },
        { select: '-password' },
      );

      if (!passenger) {
        throw new NotFoundException(`Passenger with ID ${passengerId} not found`);
      }

      // Get passenger documents
      const documents = await this.passengerDocumentRepository.find({ passengerId: passengerObjectId });

      // Get recent rides (last 5)
      const recentRides = await this.passengerRideRepository.find(
        { passengerId: passengerObjectId },
        { sort: { createdAt: -1 }, limit: 5 },
      );

      // Get ratings
      const ratings = await this.passengerRatingRepository.find(
        { passengerId: passengerObjectId },
        { sort: { createdAt: -1 } },
      );

      // Calculate statistics
      const allRides = await this.passengerRideRepository.find({ passengerId: passengerObjectId });

      const totalRides = allRides.length;
      const completedRides = allRides.filter((ride) => ride.status === 'ride_completed').length;
      const cancelledRides = allRides.filter((ride) => ride.status === 'ride_cancelled').length;

      const ratingSum = ratings.reduce((sum, rating) => sum + rating.overallRating, 0);
      const averageRating = ratings.length > 0 ? ratingSum / ratings.length : 0;

      const totalSpent = allRides.reduce((sum, ride) => {
        return sum + (ride.estimatedFare || 0);
      }, 0);

      return {
        passenger,
        documents,
        recentRides,
        ratings,
        statistics: {
          totalRides,
          completedRides,
          cancelledRides,
          averageRating: parseFloat(averageRating.toFixed(2)),
          totalSpent: parseFloat(totalSpent.toFixed(2)),
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Error retrieving passenger details: ${error.message}`);
    }
  }

  async getPassengerRides(passengerId: string, query: GetPassengerRidesDto) {
    // Validate ID format
    if (!Types.ObjectId.isValid(passengerId)) {
      throw new BadRequestException('Invalid passenger ID format');
    }

    const passengerObjectId = new Types.ObjectId(passengerId);
    const { page = 1, limit = 10, status, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    // Check if passenger exists
    const passenger = await this.passengerUserRepository.findOne({
      _id: passengerObjectId,
      type: Role.PASSENGER,
    });

    if (!passenger) {
      throw new NotFoundException(`Passenger with ID ${passengerId} not found`);
    }

    // Build filter
    const filter: any = { passengerId: passengerObjectId };
    if (status) filter.status = status;

    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else if (startDate) {
      filter.createdAt = { $gte: new Date(startDate) };
    } else if (endDate) {
      filter.createdAt = { $lte: new Date(endDate) };
    }

    // Get rides with pagination
    const [rides, totalCount] = await Promise.all([
      this.passengerRideRepository.model
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate([{ path: 'driverId', select: 'firstName lastName phone email photo' }])
        .exec(),

      this.passengerRideRepository.model.countDocuments(filter),
    ]);

    return {
      data: rides,
      meta: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async getRideDetails(rideId: string) {
    // Validate ID format
    if (!Types.ObjectId.isValid(rideId)) {
      throw new BadRequestException('Invalid ride ID format');
    }

    const rideObjectId = new Types.ObjectId(rideId);

    // Get ride details with populated fields
    const ride = await this.passengerRideRepository.findOne(
      { _id: rideObjectId },
      {
        populate: [
          { path: 'passengerId', select: 'firstName lastName phone email photo' },
          { path: 'driverId', select: 'firstName lastName phone email photo' },
        ],
      },
    );

    if (!ride) {
      throw new NotFoundException(`Ride with ID ${rideId} not found`);
    }

    return ride;
  }

  async getPassengerDocuments(passengerId: string) {
    // Validate ID format
    if (!Types.ObjectId.isValid(passengerId)) {
      throw new BadRequestException('Invalid passenger ID format');
    }

    const passengerObjectId = new Types.ObjectId(passengerId);

    // Check if passenger exists
    const passenger = await this.passengerUserRepository.findOne({
      _id: passengerObjectId,
      type: Role.PASSENGER,
    });

    if (!passenger) {
      throw new NotFoundException(`Passenger with ID ${passengerId} not found`);
    }

    // Get documents
    const documents = await this.passengerDocumentRepository.find(
      { passengerId: passengerObjectId },
      { sort: { createdAt: -1 } },
    );

    return documents;
  }

  async getPassengerReports(passengerId: string, query: GetPassengerReportsDto) {
    // Validate ID format
    if (!Types.ObjectId.isValid(passengerId)) {
      throw new BadRequestException('Invalid passenger ID format');
    }

    const passengerObjectId = new Types.ObjectId(passengerId);
    const { page = 1, limit = 10, status, issueType, severityLevel, assignedToMe } = query;
    const skip = (page - 1) * limit;

    // Check if passenger exists
    const passenger = await this.passengerUserRepository.findOne({
      _id: passengerObjectId,
      type: Role.PASSENGER,
    });

    if (!passenger) {
      throw new NotFoundException(`Passenger with ID ${passengerId} not found`);
    }

    // Build filter
    const filter: any = {
      $or: [{ passengerId: passengerObjectId }, { reportedBy: passengerObjectId }],
    };

    if (status) filter.status = status;
    if (issueType) filter.issueType = issueType;
    if (severityLevel) filter.severityLevel = severityLevel;
    if (assignedToMe) filter.assignedToAdminId = assignedToMe;

    // Get reports with pagination
    const [reports, totalCount] = await Promise.all([
      this.passengerReportRepository.model
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate([
          { path: 'reportedBy', select: 'firstName lastName type' },
          { path: 'assignedToAdminId', select: 'firstName lastName email' },
        ])
        .exec(),
      this.passengerReportRepository.model.countDocuments(filter),
    ]);

    return {
      data: reports,
      meta: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async getPassengerRatings(passengerId: string) {
    // Validate ID format
    if (!Types.ObjectId.isValid(passengerId)) {
      throw new BadRequestException('Invalid passenger ID format');
    }

    const passengerObjectId = new Types.ObjectId(passengerId);

    // Check if passenger exists
    const passenger = await this.passengerUserRepository.findOne({
      _id: passengerObjectId,
      type: Role.PASSENGER,
    });

    if (!passenger) {
      throw new NotFoundException(`Passenger with ID ${passengerId} not found`);
    }

    // Get ratings
    const ratings = await this.passengerRatingRepository.find(
      { passengerId: passengerObjectId },
      {
        sort: { createdAt: -1 },
        populate: [{ path: 'rideId' }, { path: 'ratedBy', select: 'firstName lastName type' }],
      },
    );

    return ratings;
  }

  async updatePassengerStatus(passengerId: string, isActive: boolean, reason?: string) {
    // Validate ID format
    if (!Types.ObjectId.isValid(passengerId)) {
      throw new BadRequestException('Invalid passenger ID format');
    }

    const passengerObjectId = new Types.ObjectId(passengerId);

    // Check if passenger exists
    const passenger = await this.passengerUserRepository.findOne({
      _id: passengerObjectId,
      type: Role.PASSENGER,
    });

    if (!passenger) {
      throw new NotFoundException(`Passenger with ID ${passengerId} not found`);
    }

    // Update status
    const updatedPassenger = await this.passengerUserRepository.findOneAndUpdate(
      { _id: passengerObjectId },
      {
        isActive,
        ...(reason && { statusChangeReason: reason }),
        statusLastUpdated: new Date(),
      },
      { new: true },
    );

    return {
      success: true,
      message: `Passenger ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: updatedPassenger,
    };
  }

  // Dashboard statistics
  async getDashboardStats() {
    // Get passenger counts
    const [totalPassengers, activePassengers, inactivePassengers, verifiedPassengers, unverifiedPassengers] =
      await Promise.all([
        this.passengerUserRepository.countDocuments({ type: Role.PASSENGER }),
        this.passengerUserRepository.countDocuments({ type: Role.PASSENGER, isActive: true }),
        this.passengerUserRepository.countDocuments({ type: Role.PASSENGER, isActive: false }),
        this.passengerUserRepository.countDocuments({ type: Role.PASSENGER, isVerified: true }),
        this.passengerUserRepository.countDocuments({ type: Role.PASSENGER, isVerified: false }),
      ]);

    // Get document counts
    const [pendingDocuments, verifiedDocuments, rejectedDocuments] = await Promise.all([
      this.passengerDocumentRepository.countDocuments({ status: 'pending' }),
      this.passengerDocumentRepository.countDocuments({ status: 'verified' }),
      this.passengerDocumentRepository.countDocuments({ status: 'rejected' }),
    ]);

    // Get report counts
    const [openReports, inReviewReports, resolvedReports, closedReports] = await Promise.all([
      this.passengerReportRepository.countDocuments({ status: 'open' }),
      this.passengerReportRepository.countDocuments({ status: 'in_review' }),
      this.passengerReportRepository.countDocuments({ status: 'resolved' }),
      this.passengerReportRepository.countDocuments({ status: 'closed' }),
    ]);

    return {
      passengerStats: {
        total: totalPassengers,
        active: activePassengers,
        inactive: inactivePassengers,
        verified: verifiedPassengers,
        unverified: unverifiedPassengers,
      },
      documentStats: {
        pending: pendingDocuments,
        verified: verifiedDocuments,
        rejected: rejectedDocuments,
      },
      reportStats: {
        open: openReports,
        inReview: inReviewReports,
        resolved: resolvedReports,
        closed: closedReports,
      },
    };
  }
}
