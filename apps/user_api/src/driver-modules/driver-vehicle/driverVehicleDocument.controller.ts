import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  ParseBoolPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { Types } from 'mongoose';
import {
  CreateVehicleDocumentDto,
  UpdateVehicleDocumentDto,
  VehicleDocumentResponseDto,
  VehicleDocumentsSummaryDto,
  CarInsuranceDetailsDto,
  CarRentalAgreementDetailsDto,
  PuspakomInspectionDetailsDto,
  TaxiPermitVehicleDetailsDto,
  AuthorizationLetterDetailsDto,
} from './dto/uploadVehicleDocument.dto';
import {
  JwtAuthGuard,
  RolesGuard,
  Role,
  CurrentUser,
  User,
  SetRolesMetaData,
  VehicleDocumentType,
} from '@urcab-workspace/shared';
import { VehicleDocumentService } from './driverVehicleDocument.service';

@ApiTags('Vehicle Documents')
@Controller('driver/vehicles/:vehicleId/documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VehicleDocumentController {
  constructor(private readonly vehicleDocumentService: VehicleDocumentService) {}

  // ===== Car Insurance Document Endpoints =====
  @Post('car-insurance')
  @ApiOperation({ summary: 'Upload car insurance document' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID', type: 'string' })
  @ApiBody({ type: CarInsuranceDetailsDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Car insurance document uploaded successfully',
    type: VehicleDocumentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid car insurance data',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Vehicle does not belong to this driver',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Vehicle not found',
  })
  @HttpCode(HttpStatus.CREATED)
  @SetRolesMetaData(Role.DRIVER)
  async uploadCarInsurance(
    @Param('vehicleId') vehicleId: string,
    @Body() carInsuranceDetails: CarInsuranceDetailsDto,
    @CurrentUser() user: User,
  ): Promise<VehicleDocumentResponseDto> {
    const driverId = new Types.ObjectId(user._id);
    return await this.vehicleDocumentService.uploadCarInsuranceDocument(vehicleId, driverId, carInsuranceDetails);
  }

  @Put('car-insurance/:documentId')
  @ApiOperation({ summary: 'Update car insurance document' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID', type: 'string' })
  @ApiParam({ name: 'documentId', description: 'Document ID', type: 'string' })
  @ApiBody({ type: CarInsuranceDetailsDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Car insurance document updated successfully',
    type: VehicleDocumentResponseDto,
  })
  @SetRolesMetaData(Role.DRIVER)
  async updateCarInsurance(
    @Param('vehicleId') vehicleId: string,
    @Param('documentId') documentId: string,
    @Body() carInsuranceDetails: CarInsuranceDetailsDto,
    @CurrentUser() user: User,
  ): Promise<VehicleDocumentResponseDto> {
    const driverId = new Types.ObjectId(user._id);
    return await this.vehicleDocumentService.updateCarInsuranceDocument(documentId, driverId, carInsuranceDetails);
  }

  @Get('car-insurance')
  @ApiOperation({ summary: 'Get car insurance document' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Car insurance document retrieved successfully',
    type: VehicleDocumentResponseDto,
  })
  @SetRolesMetaData(Role.DRIVER)
  async getCarInsurance(
    @Param('vehicleId') vehicleId: string,
    @CurrentUser() user: User,
  ): Promise<VehicleDocumentResponseDto | null> {
    const driverId = new Types.ObjectId(user._id);
    return await this.vehicleDocumentService.getVehicleDocumentByType(
      vehicleId,
      VehicleDocumentType.CAR_INSURANCE,
      driverId,
    );
  }

  // ===== Car Rental Agreement Document Endpoints =====
  @Post('car-rental-agreement')
  @ApiOperation({ summary: 'Upload car rental agreement document' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID', type: 'string' })
  @ApiBody({ type: CarRentalAgreementDetailsDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Car rental agreement document uploaded successfully',
    type: VehicleDocumentResponseDto,
  })
  @HttpCode(HttpStatus.CREATED)
  @SetRolesMetaData(Role.DRIVER)
  async uploadCarRentalAgreement(
    @Param('vehicleId') vehicleId: string,
    @Body() carRentalAgreementDetails: CarRentalAgreementDetailsDto,
    @CurrentUser() user: User,
  ): Promise<VehicleDocumentResponseDto> {
    const driverId = new Types.ObjectId(user._id);
    return await this.vehicleDocumentService.uploadCarRentalAgreementDocument(
      vehicleId,
      driverId,
      carRentalAgreementDetails,
    );
  }

  @Put('car-rental-agreement/:documentId')
  @ApiOperation({ summary: 'Update car rental agreement document' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID', type: 'string' })
  @ApiParam({ name: 'documentId', description: 'Document ID', type: 'string' })
  @ApiBody({ type: CarRentalAgreementDetailsDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Car rental agreement document updated successfully',
    type: VehicleDocumentResponseDto,
  })
  @SetRolesMetaData(Role.DRIVER)
  async updateCarRentalAgreement(
    @Param('vehicleId') vehicleId: string,
    @Param('documentId') documentId: string,
    @Body() carRentalAgreementDetails: CarRentalAgreementDetailsDto,
    @CurrentUser() user: User,
  ): Promise<VehicleDocumentResponseDto> {
    const driverId = new Types.ObjectId(user._id);
    return await this.vehicleDocumentService.updateCarRentalAgreementDocument(
      documentId,
      driverId,
      carRentalAgreementDetails,
    );
  }

  @Get('car-rental-agreement')
  @ApiOperation({ summary: 'Get car rental agreement document' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Car rental agreement document retrieved successfully',
    type: VehicleDocumentResponseDto,
  })
  @SetRolesMetaData(Role.DRIVER)
  async getCarRentalAgreement(
    @Param('vehicleId') vehicleId: string,
    @CurrentUser() user: User,
  ): Promise<VehicleDocumentResponseDto | null> {
    const driverId = new Types.ObjectId(user._id);
    return await this.vehicleDocumentService.getVehicleDocumentByType(
      vehicleId,
      VehicleDocumentType.CAR_RENTAL_AGREEMENT,
      driverId,
    );
  }

  // ===== Puspakom Inspection Document Endpoints =====
  @Post('puspakom-inspection')
  @ApiOperation({ summary: 'Upload Puspakom inspection document' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID', type: 'string' })
  @ApiBody({ type: PuspakomInspectionDetailsDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Puspakom inspection document uploaded successfully',
    type: VehicleDocumentResponseDto,
  })
  @HttpCode(HttpStatus.CREATED)
  @SetRolesMetaData(Role.DRIVER)
  async uploadPuspakomInspection(
    @Param('vehicleId') vehicleId: string,
    @Body() puspakomInspectionDetails: PuspakomInspectionDetailsDto,
    @CurrentUser() user: User,
  ): Promise<VehicleDocumentResponseDto> {
    const driverId = new Types.ObjectId(user._id);
    return await this.vehicleDocumentService.uploadPuspakomInspectionDocument(
      vehicleId,
      driverId,
      puspakomInspectionDetails,
    );
  }

  @Put('puspakom-inspection/:documentId')
  @ApiOperation({ summary: 'Update Puspakom inspection document' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID', type: 'string' })
  @ApiParam({ name: 'documentId', description: 'Document ID', type: 'string' })
  @ApiBody({ type: PuspakomInspectionDetailsDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Puspakom inspection document updated successfully',
    type: VehicleDocumentResponseDto,
  })
  @SetRolesMetaData(Role.DRIVER)
  async updatePuspakomInspection(
    @Param('vehicleId') vehicleId: string,
    @Param('documentId') documentId: string,
    @Body() puspakomInspectionDetails: PuspakomInspectionDetailsDto,
    @CurrentUser() user: User,
  ): Promise<VehicleDocumentResponseDto> {
    const driverId = new Types.ObjectId(user._id);
    return await this.vehicleDocumentService.updatePuspakomInspectionDocument(
      documentId,
      driverId,
      puspakomInspectionDetails,
    );
  }

  @Get('puspakom-inspection')
  @ApiOperation({ summary: 'Get Puspakom inspection document' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Puspakom inspection document retrieved successfully',
    type: VehicleDocumentResponseDto,
  })
  @SetRolesMetaData(Role.DRIVER)
  async getPuspakomInspection(
    @Param('vehicleId') vehicleId: string,
    @CurrentUser() user: User,
  ): Promise<VehicleDocumentResponseDto | null> {
    const driverId = new Types.ObjectId(user._id);
    return await this.vehicleDocumentService.getVehicleDocumentByType(
      vehicleId,
      VehicleDocumentType.PUSPAKOM_INSPECTION,
      driverId,
    );
  }

  // ===== Taxi Permit Vehicle Document Endpoints =====
  @Post('taxi-permit')
  @ApiOperation({ summary: 'Upload taxi permit document' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID', type: 'string' })
  @ApiBody({ type: TaxiPermitVehicleDetailsDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Taxi permit document uploaded successfully',
    type: VehicleDocumentResponseDto,
  })
  @HttpCode(HttpStatus.CREATED)
  @SetRolesMetaData(Role.DRIVER)
  async uploadTaxiPermit(
    @Param('vehicleId') vehicleId: string,
    @Body() taxiPermitVehicleDetails: TaxiPermitVehicleDetailsDto,
    @CurrentUser() user: User,
  ): Promise<VehicleDocumentResponseDto> {
    const driverId = new Types.ObjectId(user._id);
    return await this.vehicleDocumentService.uploadTaxiPermitDocument(vehicleId, driverId, taxiPermitVehicleDetails);
  }

  @Put('taxi-permit/:documentId')
  @ApiOperation({ summary: 'Update taxi permit document' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID', type: 'string' })
  @ApiParam({ name: 'documentId', description: 'Document ID', type: 'string' })
  @ApiBody({ type: TaxiPermitVehicleDetailsDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Taxi permit document updated successfully',
    type: VehicleDocumentResponseDto,
  })
  @SetRolesMetaData(Role.DRIVER)
  async updateTaxiPermit(
    @Param('vehicleId') vehicleId: string,
    @Param('documentId') documentId: string,
    @Body() taxiPermitVehicleDetails: TaxiPermitVehicleDetailsDto,
    @CurrentUser() user: User,
  ): Promise<VehicleDocumentResponseDto> {
    const driverId = new Types.ObjectId(user._id);
    return await this.vehicleDocumentService.updateTaxiPermitDocument(documentId, driverId, taxiPermitVehicleDetails);
  }

  @Get('taxi-permit')
  @ApiOperation({ summary: 'Get taxi permit document' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Taxi permit document retrieved successfully',
    type: VehicleDocumentResponseDto,
  })
  @SetRolesMetaData(Role.DRIVER)
  async getTaxiPermit(
    @Param('vehicleId') vehicleId: string,
    @CurrentUser() user: User,
  ): Promise<VehicleDocumentResponseDto | null> {
    const driverId = new Types.ObjectId(user._id);
    return await this.vehicleDocumentService.getVehicleDocumentByType(
      vehicleId,
      VehicleDocumentType.TAXI_PERMIT_VEHICLE,
      driverId,
    );
  }

  // ===== Authorization Letter Document Endpoints =====
  @Post('authorization-letter')
  @ApiOperation({ summary: 'Upload authorization letter document' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID', type: 'string' })
  @ApiBody({ type: AuthorizationLetterDetailsDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Authorization letter document uploaded successfully',
    type: VehicleDocumentResponseDto,
  })
  @HttpCode(HttpStatus.CREATED)
  @SetRolesMetaData(Role.DRIVER)
  async uploadAuthorizationLetter(
    @Param('vehicleId') vehicleId: string,
    @Body() authorizationLetterDetails: AuthorizationLetterDetailsDto,
    @CurrentUser() user: User,
  ): Promise<VehicleDocumentResponseDto> {
    const driverId = new Types.ObjectId(user._id);
    return await this.vehicleDocumentService.uploadAuthorizationLetterDocument(
      vehicleId,
      driverId,
      authorizationLetterDetails,
    );
  }

  @Put('authorization-letter/:documentId')
  @ApiOperation({ summary: 'Update authorization letter document' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID', type: 'string' })
  @ApiParam({ name: 'documentId', description: 'Document ID', type: 'string' })
  @ApiBody({ type: AuthorizationLetterDetailsDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Authorization letter document updated successfully',
    type: VehicleDocumentResponseDto,
  })
  @SetRolesMetaData(Role.DRIVER)
  async updateAuthorizationLetter(
    @Param('vehicleId') vehicleId: string,
    @Param('documentId') documentId: string,
    @Body() authorizationLetterDetails: AuthorizationLetterDetailsDto,
    @CurrentUser() user: User,
  ): Promise<VehicleDocumentResponseDto> {
    const driverId = new Types.ObjectId(user._id);
    return await this.vehicleDocumentService.updateAuthorizationLetterDocument(
      documentId,
      driverId,
      authorizationLetterDetails,
    );
  }

  @Get('authorization-letter')
  @ApiOperation({ summary: 'Get authorization letter document' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Authorization letter document retrieved successfully',
    type: VehicleDocumentResponseDto,
  })
  @SetRolesMetaData(Role.DRIVER)
  async getAuthorizationLetter(
    @Param('vehicleId') vehicleId: string,
    @CurrentUser() user: User,
  ): Promise<VehicleDocumentResponseDto | null> {
    const driverId = new Types.ObjectId(user._id);
    return await this.vehicleDocumentService.getVehicleDocumentByType(
      vehicleId,
      VehicleDocumentType.AUTHORIZATION_LETTER,
      driverId,
    );
  }

  // ===== Document Status and Summary Endpoints =====
  @Get('status')
  @ApiOperation({ summary: 'Get vehicle documents status summary' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vehicle documents status retrieved successfully',
    type: VehicleDocumentsSummaryDto,
  })
  @SetRolesMetaData(Role.DRIVER)
  async getDocumentsStatus(
    @Param('vehicleId') vehicleId: string,
    @CurrentUser() user: User,
  ): Promise<VehicleDocumentsSummaryDto> {
    const driverId = new Types.ObjectId(user._id);
    return await this.vehicleDocumentService.getVehicleDocumentsSummary(vehicleId, driverId);
  }

  @Get('progress')
  @ApiOperation({ summary: 'Get vehicle documentation progress' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vehicle documentation progress retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        vehicleId: { type: 'string' },
        totalRequired: { type: 'number' },
        uploaded: { type: 'number' },
        verified: { type: 'number' },
        rejected: { type: 'number' },
        pending: { type: 'number' },
        progressPercentage: { type: 'number' },
        nextStep: { type: 'string' },
        canProceed: { type: 'boolean' },
        missingDocuments: {
          type: 'array',
          items: { type: 'string', enum: Object.values(VehicleDocumentType) },
        },
      },
    },
  })
  @SetRolesMetaData(Role.DRIVER)
  async getDocumentationProgress(
    @Param('vehicleId') vehicleId: string,
    @CurrentUser() user: User,
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
    const driverId = new Types.ObjectId(user._id);
    return await this.vehicleDocumentService.getVehicleDocumentationProgress(vehicleId, driverId);
  }

  // ===== Existing General Endpoints =====
  @Post()
  @ApiOperation({ summary: 'Upload a vehicle document (general)' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID', type: 'string' })
  @ApiBody({ type: CreateVehicleDocumentDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Vehicle document uploaded successfully',
    type: VehicleDocumentResponseDto,
  })
  @HttpCode(HttpStatus.CREATED)
  @SetRolesMetaData(Role.DRIVER)
  async uploadDocument(
    @Param('vehicleId') vehicleId: string,
    @Body() createDocumentDto: CreateVehicleDocumentDto,
    @CurrentUser() user: User,
  ): Promise<VehicleDocumentResponseDto> {
    const driverId = new Types.ObjectId(user._id);
    return await this.vehicleDocumentService.createVehicleDocument(vehicleId, driverId, createDocumentDto);
  }

  @Put(':documentId')
  @ApiOperation({ summary: 'Update a vehicle document' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID', type: 'string' })
  @ApiParam({ name: 'documentId', description: 'Document ID', type: 'string' })
  @ApiBody({ type: UpdateVehicleDocumentDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vehicle document updated successfully',
    type: VehicleDocumentResponseDto,
  })
  @SetRolesMetaData(Role.DRIVER)
  async updateDocument(
    @Param('vehicleId') vehicleId: string,
    @Param('documentId') documentId: string,
    @Body() updateDocumentDto: UpdateVehicleDocumentDto,
    @CurrentUser() user: User,
  ): Promise<VehicleDocumentResponseDto> {
    const driverId = new Types.ObjectId(user._id);
    return await this.vehicleDocumentService.updateVehicleDocument(documentId, driverId, updateDocumentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all vehicle documents' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID', type: 'string' })
  @ApiQuery({
    name: 'includeInactive',
    description: 'Include inactive documents (previous versions)',
    required: false,
    type: 'boolean',
    example: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vehicle documents retrieved successfully',
    type: [VehicleDocumentResponseDto],
  })
  @SetRolesMetaData(Role.DRIVER)
  async getAllDocuments(
    @Param('vehicleId') vehicleId: string,
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive: boolean = false,
    @CurrentUser() user: User,
  ): Promise<VehicleDocumentResponseDto[]> {
    const driverId = new Types.ObjectId(user._id);
    return await this.vehicleDocumentService.getAllVehicleDocuments(vehicleId, driverId, includeInactive);
  }

  @Get('type/:documentType')
  @ApiOperation({ summary: 'Get vehicle document by type' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID', type: 'string' })
  @ApiParam({
    name: 'documentType',
    description: 'Document type',
    enum: VehicleDocumentType,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vehicle document retrieved successfully',
    type: VehicleDocumentResponseDto,
  })
  @SetRolesMetaData(Role.DRIVER)
  async getDocumentByType(
    @Param('vehicleId') vehicleId: string,
    @Param('documentType') documentType: VehicleDocumentType,
    @CurrentUser() user: User,
  ): Promise<VehicleDocumentResponseDto | null> {
    const driverId = new Types.ObjectId(user._id);
    return await this.vehicleDocumentService.getVehicleDocumentByType(vehicleId, documentType, driverId);
  }

  @Get(':documentId')
  @ApiOperation({ summary: 'Get vehicle document by ID' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID', type: 'string' })
  @ApiParam({ name: 'documentId', description: 'Document ID', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vehicle document retrieved successfully',
    type: VehicleDocumentResponseDto,
  })
  @SetRolesMetaData(Role.DRIVER)
  async getDocument(
    @Param('vehicleId') vehicleId: string,
    @Param('documentId') documentId: string,
    @CurrentUser() user: User,
  ): Promise<VehicleDocumentResponseDto> {
    const driverId = new Types.ObjectId(user._id);
    return await this.vehicleDocumentService.getVehicleDocument(documentId, driverId);
  }

  @Delete(':documentId')
  @ApiOperation({ summary: 'Delete (deactivate) a vehicle document' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID', type: 'string' })
  @ApiParam({ name: 'documentId', description: 'Document ID', type: 'string' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Vehicle document deleted successfully',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @SetRolesMetaData(Role.DRIVER)
  async deleteDocument(
    @Param('vehicleId') vehicleId: string,
    @Param('documentId') documentId: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    const driverId = new Types.ObjectId(user._id);
    await this.vehicleDocumentService.deleteVehicleDocument(documentId, driverId);
  }
}

// Additional controller for driver-level vehicle document operations
@ApiTags('Driver Vehicle Documents')
@Controller('driver/vehicle-documents')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@SetRolesMetaData(Role.DRIVER)
export class DriverVehicleDocumentController {
  constructor(private readonly vehicleDocumentService: VehicleDocumentService) {}

  @Get()
  @ApiOperation({ summary: 'Get all vehicle documents for the driver' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Driver vehicle documents retrieved successfully',
    type: [VehicleDocumentResponseDto],
  })
  async getAllDriverVehicleDocuments(@CurrentUser() user: User): Promise<VehicleDocumentResponseDto[]> {
    const driverId = new Types.ObjectId(user._id);
    return await this.vehicleDocumentService.getDriverVehicleDocuments(driverId);
  }

  @Get('expiring')
  @ApiOperation({ summary: 'Get expiring vehicle documents for the driver' })
  @ApiQuery({
    name: 'daysAhead',
    description: 'Number of days ahead to check for expiry',
    required: false,
    type: 'number',
    example: 30,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Expiring vehicle documents retrieved successfully',
    type: [VehicleDocumentResponseDto],
  })
  async getExpiringDocuments(
    @Query('daysAhead') daysAhead: number = 30,
    @CurrentUser() user: User,
  ): Promise<VehicleDocumentResponseDto[]> {
    const driverId = new Types.ObjectId(user._id);
    return await this.vehicleDocumentService.getExpiringDriverVehicleDocuments(driverId, daysAhead);
  }
}
