import { Controller, Get, Param, Query, UseGuards, Patch, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AdminPassengersService } from './adminPassengers.service';
import { JwtAdminAuthGuard } from '@urcab-workspace/shared';
import {
  GetPassengersDto,
  GetPassengerRidesDto,
  GetPassengerReportsDto,
  PassengerDetailsResponseDto,
  PassengerDocumentApprovalDto,
} from './dto';
import { Role, SetRolesMetaData } from '@urcab-workspace/shared';

@ApiTags('Admin - Passengers Management')
@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard)
@Controller('admin/passengers')
export class AdminPassengersController {
  constructor(private readonly adminPassengersService: AdminPassengersService) {}

  // Passenger Management APIs
  @Get()
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get all passengers with filters and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'isVerified', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Passengers retrieved successfully' })
  async getAllPassengers(@Query() query: GetPassengersDto) {
    return this.adminPassengersService.getAllPassengers(query);
  }

  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Get passenger management dashboard statistics' })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async getDashboardStats() {
    return this.adminPassengersService.getDashboardStats();
  }

  @Get(':passengerId')
  @ApiOperation({ summary: 'Get detailed passenger information' })
  @ApiParam({ name: 'passengerId', description: 'Passenger ID' })
  @ApiResponse({
    status: 200,
    description: 'Passenger details retrieved successfully',
    type: PassengerDetailsResponseDto,
  })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async getPassengerDetails(@Param('passengerId') passengerId: string) {
    return this.adminPassengersService.getPassengerDetails(passengerId);
  }

  @Patch(':passengerId/status')
  @ApiOperation({ summary: 'Update passenger status (activate/deactivate)' })
  @ApiParam({ name: 'passengerId', description: 'Passenger ID' })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async updatePassengerStatus(
    @Param('passengerId') passengerId: string,
    @Body() body: { isActive: boolean; reason?: string },
  ) {
    return this.adminPassengersService.updatePassengerStatus(passengerId, body.isActive, body.reason);
  }

  @Get(':passengerId/rides')
  @ApiOperation({ summary: 'Get all rides for a specific passenger' })
  @ApiParam({ name: 'passengerId', description: 'Passenger ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async getPassengerRides(@Param('passengerId') passengerId: string, @Query() query: GetPassengerRidesDto) {
    return this.adminPassengersService.getPassengerRides(passengerId, query);
  }

  @Get('rides/:rideId')
  @ApiOperation({ summary: 'Get ride details' })
  @ApiParam({ name: 'rideId', description: 'Ride ID' })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async getRideDetails(@Param('rideId') rideId: string) {
    return this.adminPassengersService.getRideDetails(rideId);
  }

  @Get(':passengerId/documents')
  @ApiOperation({ summary: 'Get all documents for a passenger' })
  @ApiParam({ name: 'passengerId', description: 'Passenger ID' })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async getPassengerDocuments(@Param('passengerId') passengerId: string) {
    return this.adminPassengersService.getPassengerDocuments(passengerId);
  }

  @Get('documents/:documentId')
  @ApiOperation({ summary: 'Get passenger document details' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async getPassengerDocumentDetails(@Param('documentId') documentId: string) {
    return this.adminPassengersService.getPassengerDocumentDetails(documentId);
  }

  @Patch('documents/:documentId/approve')
  @ApiOperation({ summary: 'Approve passenger document' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Document approved successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async approvePassengerDocument(@Param('documentId') documentId: string, @Body() body: PassengerDocumentApprovalDto) {
    return this.adminPassengersService.approvePassengerDocument(documentId, body);
  }

  @Patch('documents/:documentId/reject')
  @ApiOperation({ summary: 'Reject passenger document' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Document rejected successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async rejectPassengerDocument(@Param('documentId') documentId: string, @Body() body: PassengerDocumentApprovalDto) {
    return this.adminPassengersService.rejectPassengerDocument(documentId, body);
  }

  @Get(':passengerId/reports')
  @ApiOperation({ summary: 'Get all reports for a passenger' })
  @ApiParam({ name: 'passengerId', description: 'Passenger ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'issueType', required: false, type: String })
  @ApiQuery({ name: 'severityLevel', required: false, type: Number })
  @ApiQuery({ name: 'assignedToMe', required: false, type: Boolean })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async getPassengerReports(@Param('passengerId') passengerId: string, @Query() query: GetPassengerReportsDto) {
    return this.adminPassengersService.getPassengerReports(passengerId, query);
  }

  @Get(':passengerId/ratings')
  @ApiOperation({ summary: 'Get all ratings for a passenger' })
  @ApiParam({ name: 'passengerId', description: 'Passenger ID' })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async getPassengerRatings(@Param('passengerId') passengerId: string) {
    return this.adminPassengersService.getPassengerRatings(passengerId);
  }
}
