import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  IssueReport,
  IssueReportRepository,
  RideRepository,
  RideStatus,
  IssueStatus,
  UserRepository,
} from '@urcab-workspace/shared';
import { SubmitIssueReportDto } from './dtos';

@Injectable()
export class IssueReportsService {
  constructor(
    private readonly issueReportRepository: IssueReportRepository,
    private readonly rideRepository: RideRepository,
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * Submit an issue report from a passenger
   */
  async submitIssueReport(
    reporterId: Types.ObjectId,
    submitIssueReportDto: SubmitIssueReportDto,
  ): Promise<IssueReport> {
    const {
      rideId,
      reportedUserId,
      issueType,
      description,

      // incidentLocation,
      isAnonymous,
    } = submitIssueReportDto;

    // Check if ride exists and belongs to the reporter
    const ride = await this.rideRepository.findOne({
      _id: new Types.ObjectId(rideId),
      passengerId: reporterId,
    });

    if (!ride) {
      throw new NotFoundException('Ride not found or you are not authorized to report issues for this ride');
    }

    // If reportedUserId is provided, verify it's the driver of the ride
    if (reportedUserId && ride.driverId && !ride.driverId.equals(new Types.ObjectId(reportedUserId))) {
      throw new BadRequestException('The reported user is not the driver of this ride');
    }

    // If no reportedUserId is provided but there's a driver, use the driver
    const finalReportedUserId = reportedUserId || ride.driverId;

    // Create the issue report
    const issueReportData: any = {
      reporterId,
      rideId: new Types.ObjectId(rideId),
      reportedUserId: finalReportedUserId ? new Types.ObjectId(finalReportedUserId) : undefined,
      issueType,
      description,
      severityLevel: 1, // Default to low severity
      attachments: [],
      incidentTime: undefined,
      // incidentLocation,
      isAnonymous: isAnonymous || false,
      status: IssueStatus.OPEN,
    };

    const issueReport = await this.issueReportRepository.create(issueReportData);

    return issueReport;
  }

  /**
   * Get issue reports submitted by a user
   */
  async getUserIssueReports(
    userId: Types.ObjectId,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    issueReports: IssueReport[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Get user's issue reports with pagination
    const issueReports = await this.issueReportRepository.findUserIssuesWithPagination(userId.toString(), page, limit);

    // Get total count
    const totalCount = await this.issueReportRepository.count({
      reporterId: userId,
    });

    return {
      issueReports,
      total: totalCount,
      page,
      limit,
    };
  }

  /**
   * Get a specific issue report by ID
   */
  async getIssueReportById(issueReportId: string, userId: Types.ObjectId): Promise<IssueReport> {
    if (!Types.ObjectId.isValid(issueReportId)) {
      throw new BadRequestException('Invalid issue report ID format');
    }

    const issueReport = await this.issueReportRepository.findOne({
      _id: new Types.ObjectId(issueReportId),
      reporterId: userId,
    });

    if (!issueReport) {
      throw new NotFoundException('Issue report not found or you are not authorized to view it');
    }

    return issueReport;
  }

  /**
   * Check if a user has already reported an issue for a specific ride
   */
  async hasUserReportedIssueForRide(rideId: string, userId: Types.ObjectId): Promise<boolean> {
    const existingReport = await this.issueReportRepository.findOne({
      rideId: new Types.ObjectId(rideId),
      reporterId: userId,
    });

    return !!existingReport;
  }

  /**
   * Get issue report statistics for a user
   */
  async getUserIssueStatistics(userId: Types.ObjectId): Promise<{
    totalReports: number;
    openReports: number;
    resolvedReports: number;
    averageSeverity: number;
  }> {
    const userReports = await this.issueReportRepository.findByReporterId(userId.toString());

    const totalReports = userReports.length;
    const openReports = userReports.filter((report) => report.status === IssueStatus.OPEN).length;
    const resolvedReports = userReports.filter((report) => report.status === IssueStatus.RESOLVED).length;

    const averageSeverity =
      userReports.length > 0
        ? userReports.reduce((sum, report) => sum + (report.severityLevel || 1), 0) / userReports.length
        : 0;

    return {
      totalReports,
      openReports,
      resolvedReports,
      averageSeverity,
    };
  }
}
