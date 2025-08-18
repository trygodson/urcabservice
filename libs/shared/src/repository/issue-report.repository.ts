import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractRepository } from '../database';
import { IssueReport, IssueReportDocument } from '../models';

@Injectable()
export class IssueReportRepository extends AbstractRepository<IssueReportDocument> {
  protected readonly logger = new Logger(IssueReportRepository.name);

  constructor(@InjectModel(IssueReport.name) issueReportModel: Model<IssueReportDocument>) {
    super(issueReportModel);
  }

  /**
   * Find issues reported by a user
   */
  async findByReporterId(reporterId: string): Promise<IssueReportDocument[]> {
    return this.find({ reporterId });
  }

  /**
   * Find issues reported against a user
   */
  async findByReportedUserId(reportedUserId: string): Promise<IssueReportDocument[]> {
    return this.find({ reportedUserId });
  }

  /**
   * Find issues by ride ID
   */
  async findByRideId(rideId: string): Promise<IssueReportDocument[]> {
    return this.find({ rideId });
  }

  /**
   * Find issues by status
   */
  async findByStatus(status: string): Promise<IssueReportDocument[]> {
    return this.find({ status });
  }

  /**
   * Find issues by type
   */
  async findByIssueType(issueType: string): Promise<IssueReportDocument[]> {
    return this.find({ issueType });
  }

  /**
   * Find high-priority issues that need immediate attention
   */
  async findHighPriorityIssues(): Promise<IssueReportDocument[]> {
    return this.model
      .find({
        severityLevel: { $gte: 4 },
        status: { $in: ['open', 'in_review'] },
      })
      .sort({ severityLevel: -1, createdAt: -1 })
      .exec();
  }

  /**
   * Find issues assigned to an admin
   */
  async findByAssignedAdmin(adminId: string): Promise<IssueReportDocument[]> {
    return this.find({ assignedToAdminId: adminId });
  }

  /**
   * Find unassigned issues
   */
  async findUnassignedIssues(): Promise<IssueReportDocument[]> {
    return this.model
      .find({
        status: 'open',
        assignedToAdminId: { $exists: false },
      })
      .sort({ severityLevel: -1, createdAt: -1 })
      .exec();
  }

  /**
   * Assign issue to admin
   */
  async assignToAdmin(issueId: string, adminId: string): Promise<IssueReportDocument> {
    return this.findOneAndUpdate(
      { _id: issueId },
      {
        assignedToAdminId: adminId,
        assignedAt: new Date(),
        status: 'in_review',
      },
    );
  }

  /**
   * Resolve issue
   */
  async resolveIssue(
    issueId: string,
    resolutionDetails: string,
    resolvedByAdminId: string,
  ): Promise<IssueReportDocument> {
    return this.findOneAndUpdate(
      { _id: issueId },
      {
        status: 'resolved',
        resolutionDetails,
        resolvedAt: new Date(),
        resolvedByAdminId,
      },
    );
  }

  /**
   * Get issue statistics
   */
  async getIssueStatistics(): Promise<any> {
    return this.model
      .aggregate([
        {
          $group: {
            _id: null,
            totalIssues: { $sum: 1 },
            openIssues: {
              $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] },
            },
            inReviewIssues: {
              $sum: { $cond: [{ $eq: ['$status', 'in_review'] }, 1, 0] },
            },
            resolvedIssues: {
              $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
            },
            highPriorityIssues: {
              $sum: { $cond: [{ $gte: ['$severityLevel', 4] }, 1, 0] },
            },
          },
        },
      ])
      .exec();
  }

  /**
   * Get issues by type statistics
   */
  async getIssuesByTypeStatistics(): Promise<any> {
    return this.model
      .aggregate([
        {
          $group: {
            _id: '$issueType',
            count: { $sum: 1 },
            avgSeverity: { $avg: '$severityLevel' },
          },
        },
        { $sort: { count: -1 } },
      ])
      .exec();
  }

  /**
   * Find issues that require follow-up
   */
  async findIssuesRequiringFollowUp(): Promise<IssueReportDocument[]> {
    return this.find({
      requiresFollowUp: true,
      followUpDate: { $lte: new Date() },
      status: { $ne: 'closed' },
    });
  }

  /**
   * Get user's issue history with pagination
   */
  async findUserIssuesWithPagination(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<IssueReportDocument[]> {
    return this.model
      .find({
        $or: [{ reporterId: userId }, { reportedUserId: userId }],
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('rideId', 'pickupLocation dropoffLocation status')
      .populate('reporterId', 'firstName lastName')
      .populate('reportedUserId', 'firstName lastName')
      .exec();
  }

  /**
   * Find repeat offenders (users with multiple reports against them)
   */
  async findRepeatOffenders(minReportCount: number = 3): Promise<any> {
    return this.model
      .aggregate([
        {
          $match: {
            reportedUserId: { $exists: true },
            status: { $in: ['resolved', 'closed'] },
          },
        },
        {
          $group: {
            _id: '$reportedUserId',
            reportCount: { $sum: 1 },
            avgSeverity: { $avg: '$severityLevel' },
            lastReportDate: { $max: '$createdAt' },
          },
        },
        {
          $match: {
            reportCount: { $gte: minReportCount },
          },
        },
        { $sort: { reportCount: -1, avgSeverity: -1 } },
      ])
      .exec();
  }
}
