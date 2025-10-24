import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { IssueReportsService } from './issue-reports.service';
import { SubmitIssueReportDto } from './dtos';
import { JwtAuthGuard, Role, CurrentUser, User, SetRolesMetaData } from '@urcab-workspace/shared';

@ApiTags('Issue Reports')
@Controller('issue-reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class IssueReportsController {
  constructor(private readonly issueReportsService: IssueReportsService) {}

  @Post('submit')
  @ApiOperation({ summary: 'Submit an issue report (Passenger only)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Issue report submitted successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid issue report data or validation error',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ride not found or not authorized',
  })
  @SetRolesMetaData(Role.PASSENGER)
  async submitIssueReport(@Body() submitIssueReportDto: SubmitIssueReportDto, @CurrentUser() user: User) {
    const reporterId = new Types.ObjectId(user._id);
    return await this.issueReportsService.submitIssueReport(reporterId, submitIssueReportDto);
  }

  @Get('my-reports')
  @ApiOperation({ summary: "Get user's issue reports" })
  @ApiQuery({
    name: 'page',
    description: 'Page number',
    required: false,
    type: 'number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of items per page',
    required: false,
    type: 'number',
    example: 10,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Issue reports retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        issueReports: {
          type: 'array',
          items: { $ref: '#/components/schemas/IssueReport' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  @SetRolesMetaData(Role.PASSENGER)
  async getUserIssueReports(
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
    @CurrentUser() user: User,
  ) {
    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 10;

    const userId = new Types.ObjectId(user._id);
    return await this.issueReportsService.getUserIssueReports(userId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get issue report details by ID' })
  @ApiParam({
    name: 'id',
    description: 'Issue report ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Issue report details retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Issue report not found or not authorized',
  })
  @SetRolesMetaData(Role.PASSENGER)
  async getIssueReportById(@Param('id') issueReportId: string, @CurrentUser() user: User) {
    if (!Types.ObjectId.isValid(issueReportId)) {
      throw new BadRequestException('Invalid issue report ID format');
    }

    const userId = new Types.ObjectId(user._id);
    return await this.issueReportsService.getIssueReportById(issueReportId, userId);
  }

  @Get('ride/:rideId/check')
  @ApiOperation({ summary: 'Check if user has already reported an issue for a ride' })
  @ApiParam({
    name: 'rideId',
    description: 'Ride ID to check',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns whether the user has reported an issue for this ride',
    schema: {
      type: 'object',
      properties: {
        hasReported: { type: 'boolean' },
        issueReport: {
          type: 'object',
          nullable: true,
          description: 'Issue report details if the user has reported an issue for this ride',
        },
      },
    },
  })
  @SetRolesMetaData(Role.PASSENGER)
  async hasUserReportedIssueForRide(@Param('rideId') rideId: string, @CurrentUser() user: User) {
    if (!Types.ObjectId.isValid(rideId)) {
      throw new BadRequestException('Invalid ride ID format');
    }

    const userId = new Types.ObjectId(user._id);
    const hasReported = await this.issueReportsService.hasUserReportedIssueForRide(rideId, userId);
    let issueReport = null;

    if (hasReported) {
      // Get the issue report details
      const reports = await this.issueReportsService.getUserIssueReports(userId, 1, 1);
      issueReport = reports.issueReports.find((report) => report.rideId.toString() === rideId);
    }

    return { hasReported, issueReport };
  }

  @Get('statistics/my')
  @ApiOperation({ summary: "Get user's issue report statistics" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Issue report statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalReports: { type: 'number' },
        openReports: { type: 'number' },
        resolvedReports: { type: 'number' },
        averageSeverity: { type: 'number' },
      },
    },
  })
  @SetRolesMetaData(Role.PASSENGER)
  async getUserIssueStatistics(@CurrentUser() user: User) {
    const userId = new Types.ObjectId(user._id);
    return await this.issueReportsService.getUserIssueStatistics(userId);
  }
}
