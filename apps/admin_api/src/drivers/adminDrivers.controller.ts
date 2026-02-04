import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { AdminDriversService } from './adminDrivers.service';
import { JwtAdminAuthGuard, RolesGuard, CurrentUser } from '@urcab-workspace/shared';
import {
  GetDriversDto,
  DriverDetailsResponseDto,
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
  GetVehicleEvpTransactionsDto,
} from './dto';
import { Role, SetRolesMetaData } from '@urcab-workspace/shared';

@ApiTags('Admin - Drivers Management')
@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard)
@Controller('admin/drivers')
export class AdminDriversController {
  constructor(private readonly adminDriversService: AdminDriversService) {}

  // Driver Management APIs
  @Get()
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get all drivers with filters and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'documentStatus', required: false, type: String })
  @ApiQuery({ name: 'isVerified', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Drivers retrieved successfully' })
  async getAllDrivers(@Query() query: GetDriversDto) {
    return this.adminDriversService.getAllDrivers(query);
  }

  @Get('evp-eligible')
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({
    summary:
      'Get all drivers eligible for EVP (verified with complete documentation and at least one vehicle with complete documentation)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'EVP eligible drivers retrieved successfully' })
  async getEvpEligibleDrivers(@Query() query: GetEvpEligibleDriversDto) {
    return this.adminDriversService.getEvpEligibleDrivers(query);
  }

  @Get('documents/pending')
  @ApiOperation({ summary: 'Get all pending driver documents' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'documentType', required: false, type: String })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async getPendingDriverDocuments(@Query() query: any) {
    return this.adminDriversService.getPendingDriverDocuments(query);
  }

  @Get('vehicle-documents/pending')
  @ApiOperation({ summary: 'Get all pending vehicle documents' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'documentType', required: false, type: String })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async getPendingVehicleDocuments(@Query() query: any) {
    return this.adminDriversService.getPendingVehicleDocuments(query);
  }

  // Rides Management APIs
  @Get('rides/all')
  @ApiOperation({ summary: 'Get all rides with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'driverId', required: false, type: String })
  @ApiQuery({ name: 'passengerId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async getAllRides(@Query() query: GetRidesDto) {
    return this.adminDriversService.getAllRides(query);
  }

  // Dashboard/Statistics APIs
  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Get driver management dashboard statistics' })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async getDashboardStats() {
    return this.adminDriversService.getDashboardStats();
  }

  @Get('dashboard/pending-tasks')
  @ApiOperation({ summary: 'Get pending admin tasks' })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async getPendingTasks() {
    return this.adminDriversService.getPendingTasks();
  }

  @Get('reports/all')
  @ApiOperation({ summary: 'Get all issue reports' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'issueType', required: false, type: String })
  @ApiQuery({ name: 'severityLevel', required: false, type: Number })
  @ApiQuery({ name: 'assignedToMe', required: false, type: Boolean })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async getAllReports(@Query() query: GetReportsDto) {
    return this.adminDriversService.getAllReports(query);
  }

  @Get(':driverId')
  @ApiOperation({ summary: 'Get detailed driver information' })
  @ApiParam({ name: 'driverId', description: 'Driver ID' })
  @ApiResponse({
    status: 200,
    description: 'Driver details retrieved successfully',
    type: DriverDetailsResponseDto,
  })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async getDriverDetails(@Param('driverId') driverId: string) {
    return this.adminDriversService.getDriverDetails(driverId);
  }

  @Patch(':driverId/verify')
  @ApiOperation({ summary: 'Verify or reject driver' })
  @ApiParam({ name: 'driverId', description: 'Driver ID' })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        isVerified: { type: 'boolean', description: 'Is driver verified' },
        // notes: { type: 'string', description: 'Notes' },
      },
    },
  })
  async verifyDriver(@Param('driverId') driverId: string, @Body() body: { isVerified: boolean }) {
    return this.adminDriversService.verifyDriver(driverId, body.isVerified);
  }

  @Patch(':driverId/status')
  @ApiOperation({ summary: 'Update driver status (activate/deactivate)' })
  @ApiParam({ name: 'driverId', description: 'Driver ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        // file: {
        //   type: 'string',
        //   format: 'binary',
        // },
        reason: {
          type: 'string',
          description: 'Optional reason name',
        },
        isActive: {
          type: 'boolean',
          description: 'Make file public (default: true)',
        },
      },
    },
  })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async updateDriverStatus(@Param('driverId') driverId: string, @Body() body: { isActive: boolean; reason?: string }) {
    return this.adminDriversService.updateDriverStatus(driverId, body.isActive, body.reason);
  }

  // Driver Documents Management APIs
  @Get(':driverId/documents')
  @ApiOperation({ summary: 'Get all documents for a driver' })
  @ApiParam({ name: 'driverId', description: 'Driver ID' })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async getDriverDocuments(@Param('driverId') driverId: string) {
    return this.adminDriversService.getDriverDocuments(driverId);
  }

  @Get('documents/:documentId')
  @ApiOperation({ summary: 'Get specific document details' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async getDocumentDetails(@Param('documentId') documentId: string) {
    return this.adminDriversService.getDocumentDetails(documentId);
  }

  @Patch('documents/:documentId/approve')
  @ApiOperation({ summary: 'Approve driver document' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async approveDriverDocument(@Param('documentId') documentId: string, @Body() body: DocumentApprovalDto) {
    return this.adminDriversService.approveDriverDocument(documentId, body);
  }

  @Patch('documents/:documentId/reject')
  @ApiOperation({ summary: 'Reject driver document' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async rejectDriverDocument(@Param('documentId') documentId: string, @Body() body: DocumentApprovalDto) {
    return this.adminDriversService.rejectDriverDocument(documentId, body);
  }

  // Vehicle Management APIs
  @Get(':driverId/vehicles')
  @ApiOperation({ summary: 'Get all vehicles for a driver' })
  @ApiParam({ name: 'driverId', description: 'Driver ID' })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async getDriverVehicles(@Param('driverId') driverId: string) {
    return this.adminDriversService.getDriverVehicles(driverId);
  }

  @Get('vehicles/:vehicleId')
  @ApiOperation({ summary: 'Get vehicle details' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID' })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async getVehicleDetails(@Param('vehicleId') vehicleId: string) {
    return this.adminDriversService.getVehicleDetails(vehicleId);
  }

  @Patch('vehicles/:vehicleId/approve')
  @ApiOperation({ summary: 'Approve vehicle' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID' })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async approveVehicle(@Param('vehicleId') vehicleId: string) {
    return this.adminDriversService.approveVehicle(vehicleId);
  }

  @Patch('vehicles/:vehicleId/reject')
  @ApiOperation({ summary: 'Reject vehicle' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID' })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async rejectVehicle(@Param('vehicleId') vehicleId: string, @Body() body?: VehicleRejectionDto) {
    return this.adminDriversService.rejectVehicle(vehicleId, body);
  }

  // Vehicle Documents Management APIs
  @Get('vehicles/:vehicleId/documents')
  @ApiOperation({ summary: 'Get all documents for a vehicle' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID' })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async getVehicleDocuments(@Param('vehicleId') vehicleId: string) {
    return this.adminDriversService.getVehicleDocuments(vehicleId);
  }

  @Get('vehicle-documents/:documentId')
  @ApiOperation({ summary: 'Get vehicle document details' })
  @ApiParam({ name: 'documentId', description: 'Vehicle Document ID' })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async getVehicleDocumentDetails(@Param('documentId') documentId: string) {
    return this.adminDriversService.getVehicleDocumentDetails(documentId);
  }

  @Patch('vehicle-documents/:documentId/approve')
  @ApiOperation({ summary: 'Approve vehicle document' })
  @ApiParam({ name: 'documentId', description: 'Vehicle Document ID' })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async approveVehicleDocument(@Param('documentId') documentId: string, @Body() body: VehicleDocumentApprovalDto) {
    return this.adminDriversService.approveVehicleDocument(documentId, body);
  }

  @Patch('vehicle-documents/:documentId/reject')
  @ApiOperation({ summary: 'Reject vehicle document' })
  @ApiParam({ name: 'documentId', description: 'Vehicle Document ID' })
  async rejectVehicleDocument(@Param('documentId') documentId: string, @Body() body: VehicleDocumentApprovalDto) {
    return this.adminDriversService.rejectVehicleDocument(documentId, body);
  }

  @Get(':driverId/rides')
  @ApiOperation({ summary: 'Get all rides for a specific driver' })
  @ApiParam({ name: 'driverId', description: 'Driver ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async getDriverRides(@Param('driverId') driverId: string, @Query() query: any) {
    return this.adminDriversService.getDriverRides(driverId, query);
  }

  @Get('rides/:rideId')
  @ApiOperation({ summary: 'Get ride details' })
  @ApiParam({ name: 'rideId', description: 'Ride ID' })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async getRideDetails(@Param('rideId') rideId: string) {
    return this.adminDriversService.getRideDetails(rideId);
  }

  // Reports Management APIs

  @Get('reports/:reportId')
  @ApiOperation({ summary: 'Get report details' })
  @ApiParam({ name: 'reportId', description: 'Report ID' })
  async getReportDetails(@Param('reportId') reportId: string) {
    return this.adminDriversService.getReportDetails(reportId);
  }

  @Patch('reports/:reportId/assign')
  @ApiOperation({ summary: 'Assign report to admin' })
  @ApiParam({ name: 'reportId', description: 'Report ID' })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async assignReport(@Param('reportId') reportId: string, @Body() body: AssignReportDto) {
    return this.adminDriversService.assignReport(reportId, body);
  }

  @Patch('reports/:reportId/resolve')
  @ApiOperation({ summary: 'Resolve report' })
  @ApiParam({ name: 'reportId', description: 'Report ID' })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async resolveReport(@Param('reportId') reportId: string, @Body() body: ResolveReportDto) {
    return this.adminDriversService.resolveReport(reportId, body);
  }

  // EVP Management APIs
  // @Post(':driverId/evp')
  // @ApiOperation({ summary: 'Generate an EVP (Electronic Verification Permit) for a driver' })
  // @ApiParam({ name: 'driverId', description: 'Driver ID' })
  // @ApiResponse({ status: 201, description: 'EVP created successfully', type: DriverEvpResponseDto })
  // @ApiResponse({ status: 400, description: 'Bad request - Driver documents not verified or already has active EVP' })
  // @ApiResponse({ status: 404, description: 'Driver not found' })
  // @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  // async createDriverEvp(
  //   @Param('driverId') driverId: string,
  //   @Body() createEvpDto: CreateDriverEvpDto,
  //   @CurrentUser() user: any,
  // ) {
  //   // Override driverId in DTO with path parameter
  //   createEvpDto.driverId = driverId;
  //   return this.adminDriversService.createDriverEvp(createEvpDto, user.sub);
  // }

  // @Get(':driverId/evp')
  // @ApiOperation({ summary: 'Get all EVPs for a driver' })
  // @ApiParam({ name: 'driverId', description: 'Driver ID' })
  // @ApiQuery({ name: 'page', required: false, type: Number })
  // @ApiQuery({ name: 'limit', required: false, type: Number })
  // @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  // @ApiResponse({ status: 200, description: 'EVPs retrieved successfully' })
  // @ApiResponse({ status: 404, description: 'Driver not found' })
  // @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  // async getDriverEvps(@Param('driverId') driverId: string, @Query() query: GetDriverEvpsDto) {
  //   return this.adminDriversService.getDriverEvps(driverId, query);
  // }

  @Get('evp/:evpId')
  @ApiOperation({ summary: 'Get EVP details by ID' })
  @ApiParam({ name: 'evpId', description: 'EVP ID' })
  @ApiResponse({ status: 200, description: 'EVP details retrieved successfully', type: DriverEvpResponseDto })
  @ApiResponse({ status: 404, description: 'EVP not found' })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async getEvpById(@Param('evpId') evpId: string) {
    return this.adminDriversService.getEvpById(evpId);
  }

  @Patch('evp/:evpId/revoke')
  @ApiOperation({ summary: 'Revoke a vehicle EVP' })
  @ApiParam({ name: 'evpId', description: 'EVP ID' })
  @ApiResponse({ status: 200, description: 'Vehicle EVP revoked successfully', type: VehicleEvpResponseDto })
  @ApiResponse({ status: 400, description: 'EVP is already inactive or revoked' })
  @ApiResponse({ status: 404, description: 'EVP not found' })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async revokeEvp(@Param('evpId') evpId: string, @Body() revokeDto: RevokeDriverEvpDto, @CurrentUser() user: any) {
    return this.adminDriversService.revokeEvp(evpId, revokeDto, user.sub);
  }

  // Vehicle EVP Management APIs

  @Post('vehicles/:vehicleId/evp')
  @ApiOperation({ summary: 'Generate an EVP for a vehicle (after payment is confirmed)' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID' })
  @ApiResponse({ status: 201, description: 'Vehicle EVP created successfully', type: VehicleEvpResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request - Vehicle documents not verified or payment not completed' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async createVehicleEvp(
    @Param('vehicleId') vehicleId: string,
    @Body() createVehicleEvpDto: CreateVehicleEvpDto,
    @CurrentUser() user: any,
  ) {
    // Override vehicleId in DTO with path parameter
    createVehicleEvpDto.vehicleId = vehicleId;
    return this.adminDriversService.createVehicleEvp(createVehicleEvpDto, user.sub);
  }

  // @Patch('vehicles/:vehicleId/setEvpForPayment')
  // @ApiOperation({ summary: 'Set EVP for payment' })
  // @ApiParam({ name: 'vehicleId', description: 'Vehicle ID' })
  // @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  // async setVehicleEvpForPayment(@Param('vehicleId') vehicleId: string) {
  //   return this.adminDriversService.setVehicleEvpForPayment(vehicleId);
  // }

  @Get('vehicles/:vehicleId/evp')
  @ApiOperation({ summary: 'Get all EVPs for a vehicle' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID' })
  @ApiResponse({ status: 200, description: 'Vehicle EVPs retrieved successfully', type: [VehicleEvpResponseDto] })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async getVehicleEvps(@Param('vehicleId') vehicleId: string) {
    return this.adminDriversService.getVehicleEvps(vehicleId);
  }

  @Get('vehicles/:vehicleId/evp-transactions')
  @ApiOperation({ summary: 'Get paginated EVP payment transactions for a vehicle' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Vehicle EVP transactions retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  async getVehicleEvpTransactions(@Param('vehicleId') vehicleId: string, @Query() query: GetVehicleEvpTransactionsDto) {
    return this.adminDriversService.getVehicleEvpTransactions(vehicleId, query);
  }
}
