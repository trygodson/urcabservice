import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  ParseBoolPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { Types } from 'mongoose';
import {
  JwtAuthGuard,
  RolesGuard,
  Role,
  CurrentUser,
  User,
  SetRolesMetaData,
  DocumentType,
} from '@urcab-workspace/shared';

// Import DTOs
import {
  NRICDetailsDto,
  PassportDetailsDto,
  PSVLicenseDetailsDto,
  PamanduDetailsDto,
  DrivingLicenseDetailsDto,
  TaxiPermitDriverDetailsDto,
  DriverDocumentResponseDto,
  DriverDocumentsSummaryDto,
} from './dto';

// Import Services
import { NRICDocumentService } from './nricDocument.service';
import { PassportDocumentService } from './passportDocument.service';
import { PSVLicenseDocumentService } from './psvLicenseDocument.service';
import { PamanduDocumentService } from './pamanduDocument.service';
import { DrivingLicenseDocumentService } from './drivingLicenseDocument.service';
import { TaxiPermitDocumentService } from './taxiDocument.service';
import {
  DocumentVerificationStatusService,
  ComplianceReport,
  DocumentRequirement,
  DetailedDocumentStatus,
} from './documentVerification.service';

@ApiTags('Driver Documents')
@Controller('driver/documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DriverDocumentController {
  constructor(
    private readonly nricDocumentService: NRICDocumentService,
    private readonly passportDocumentService: PassportDocumentService,
    private readonly psvLicenseDocumentService: PSVLicenseDocumentService,
    private readonly pamanduDocumentService: PamanduDocumentService,
    private readonly drivingLicenseDocumentService: DrivingLicenseDocumentService,
    private readonly taxiPermitDocumentService: TaxiPermitDocumentService,
    private readonly documentVerificationStatusService: DocumentVerificationStatusService,
  ) {}

  // ===== NRIC Document Endpoints =====
  @Post('nric')
  @ApiOperation({ summary: 'Upload NRIC document' })
  @ApiBody({ type: NRICDetailsDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'NRIC document uploaded successfully',
    type: DriverDocumentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid NRIC details',
  })
  @HttpCode(HttpStatus.CREATED)
  @SetRolesMetaData(Role.DRIVER)
  async uploadNRICDocument(
    @Body() nricDetails: NRICDetailsDto,
    @CurrentUser() user: User,
  ): Promise<DriverDocumentResponseDto> {
    const driverId = new Types.ObjectId(user._id);
    return await this.nricDocumentService.uploadNRICDocument(driverId, nricDetails);
  }

  @Get('nric')
  @ApiOperation({ summary: 'Get NRIC document' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'NRIC document retrieved successfully',
    type: DriverDocumentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'NRIC document not found',
  })
  @SetRolesMetaData(Role.DRIVER)
  async getNRICDocument(@CurrentUser() user: User): Promise<DriverDocumentResponseDto | null> {
    const driverId = new Types.ObjectId(user._id);
    return await this.nricDocumentService.getNRICDocument(driverId);
  }

  // ===== Passport Document Endpoints =====
  @Post('passport')
  @ApiOperation({ summary: 'Upload passport document' })
  @ApiBody({ type: PassportDetailsDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Passport document uploaded successfully',
    type: DriverDocumentResponseDto,
  })
  @HttpCode(HttpStatus.CREATED)
  @SetRolesMetaData(Role.DRIVER)
  async uploadPassportDocument(
    @Body() passportDetails: PassportDetailsDto,
    @CurrentUser() user: User,
  ): Promise<DriverDocumentResponseDto> {
    const driverId = new Types.ObjectId(user._id);
    return await this.passportDocumentService.uploadPassportDocument(driverId, passportDetails);
  }

  @Put('nric/:documentId')
  @ApiOperation({ summary: 'Update NRIC document' })
  @ApiParam({ name: 'documentId', description: 'Document ID', type: 'string' })
  @ApiBody({ type: NRICDetailsDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'NRIC document updated successfully',
    type: DriverDocumentResponseDto,
  })
  @SetRolesMetaData(Role.DRIVER)
  async updateNRICDocument(
    @Param('documentId') documentId: string,
    @Body() nricDetails: NRICDetailsDto,
    @CurrentUser() user: User,
  ): Promise<DriverDocumentResponseDto> {
    const driverId = new Types.ObjectId(user._id);
    return await this.nricDocumentService.updateNRICDocument(documentId, driverId, nricDetails);
  }

  @Put('passport/:documentId')
  @ApiOperation({ summary: 'Update passport document' })
  @ApiParam({ name: 'documentId', description: 'Document ID', type: 'string' })
  @ApiBody({ type: PassportDetailsDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Passport document updated successfully',
    type: DriverDocumentResponseDto,
  })
  @SetRolesMetaData(Role.DRIVER)
  async updatePassportDocument(
    @Param('documentId') documentId: string,
    @Body() passportDetails: PassportDetailsDto,
    @CurrentUser() user: User,
  ): Promise<DriverDocumentResponseDto> {
    const driverId = new Types.ObjectId(user._id);
    return await this.passportDocumentService.updatePassportDocument(documentId, driverId, passportDetails);
  }

  @Get('passport')
  @ApiOperation({ summary: 'Get passport document' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Passport document retrieved successfully',
    type: DriverDocumentResponseDto,
  })
  @SetRolesMetaData(Role.DRIVER)
  async getPassportDocument(@CurrentUser() user: User): Promise<DriverDocumentResponseDto | null> {
    const driverId = new Types.ObjectId(user._id);
    return await this.passportDocumentService.getPassportDocument(driverId);
  }

  // ===== PSV License Document Endpoints =====
  @Post('psv-license')
  @ApiOperation({ summary: 'Upload PSV license document' })
  @ApiBody({ type: PSVLicenseDetailsDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'PSV license document uploaded successfully',
    type: DriverDocumentResponseDto,
  })
  @HttpCode(HttpStatus.CREATED)
  @SetRolesMetaData(Role.DRIVER)
  async uploadPSVLicenseDocument(
    @Body() psvLicenseDetails: PSVLicenseDetailsDto,
    @CurrentUser() user: User,
  ): Promise<DriverDocumentResponseDto> {
    const driverId = new Types.ObjectId(user._id);
    return await this.psvLicenseDocumentService.uploadPSVLicenseDocument(driverId, psvLicenseDetails);
  }

  @Put('psv-license/:documentId')
  @ApiOperation({ summary: 'Update PSV license document' })
  @ApiParam({ name: 'documentId', description: 'Document ID', type: 'string' })
  @ApiBody({ type: PSVLicenseDetailsDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'PSV license document updated successfully',
    type: DriverDocumentResponseDto,
  })
  @SetRolesMetaData(Role.DRIVER)
  async updatePSVLicenseDocument(
    @Param('documentId') documentId: string,
    @Body() psvLicenseDetails: PSVLicenseDetailsDto,
    @CurrentUser() user: User,
  ): Promise<DriverDocumentResponseDto> {
    const driverId = new Types.ObjectId(user._id);
    return await this.psvLicenseDocumentService.updatePSVLicenseDocument(documentId, driverId, psvLicenseDetails);
  }

  @Get('psv-license')
  @ApiOperation({ summary: 'Get PSV license document' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'PSV license document retrieved successfully',
    type: DriverDocumentResponseDto,
  })
  @SetRolesMetaData(Role.DRIVER)
  async getPSVLicenseDocument(@CurrentUser() user: User): Promise<DriverDocumentResponseDto | null> {
    const driverId = new Types.ObjectId(user._id);
    return await this.psvLicenseDocumentService.getPSVLicenseDocument(driverId);
  }

  // ===== Pamandu Document Endpoints =====
  @Post('pamandu')
  @ApiOperation({ summary: 'Upload Pamandu certificate document' })
  @ApiBody({ type: PamanduDetailsDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Pamandu document uploaded successfully',
    type: DriverDocumentResponseDto,
  })
  @HttpCode(HttpStatus.CREATED)
  @SetRolesMetaData(Role.DRIVER)
  async uploadPamanduDocument(
    @Body() pamanduDetails: PamanduDetailsDto,
    @CurrentUser() user: User,
  ): Promise<DriverDocumentResponseDto> {
    const driverId = new Types.ObjectId(user._id);
    return await this.pamanduDocumentService.uploadPamanduDocument(driverId, pamanduDetails);
  }

  @Put('pamandu/:documentId')
  @ApiOperation({ summary: 'Update Pamandu certificate document' })
  @ApiParam({ name: 'documentId', description: 'Document ID', type: 'string' })
  @ApiBody({ type: PamanduDetailsDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pamandu document updated successfully',
    type: DriverDocumentResponseDto,
  })
  @SetRolesMetaData(Role.DRIVER)
  async updatePamanduDocument(
    @Param('documentId') documentId: string,
    @Body() pamanduDetails: PamanduDetailsDto,
    @CurrentUser() user: User,
  ): Promise<DriverDocumentResponseDto> {
    const driverId = new Types.ObjectId(user._id);
    return await this.pamanduDocumentService.updatePamanduDocument(documentId, driverId, pamanduDetails);
  }

  @Get('pamandu')
  @ApiOperation({ summary: 'Get Pamandu certificate document' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pamandu document retrieved successfully',
    type: DriverDocumentResponseDto,
  })
  @SetRolesMetaData(Role.DRIVER)
  async getPamanduDocument(@CurrentUser() user: User): Promise<DriverDocumentResponseDto | null> {
    const driverId = new Types.ObjectId(user._id);
    return await this.pamanduDocumentService.getPamanduDocument(driverId);
  }

  // ===== Driving License Document Endpoints =====
  @Post('driving-license')
  @ApiOperation({ summary: 'Upload driving license document' })
  @ApiBody({ type: DrivingLicenseDetailsDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Driving license document uploaded successfully',
    type: DriverDocumentResponseDto,
  })
  @HttpCode(HttpStatus.CREATED)
  @SetRolesMetaData(Role.DRIVER)
  async uploadDrivingLicenseDocument(
    @Body() drivingLicenseDetails: DrivingLicenseDetailsDto,
    @CurrentUser() user: User,
  ): Promise<DriverDocumentResponseDto> {
    const driverId = new Types.ObjectId(user._id);
    return await this.drivingLicenseDocumentService.uploadDrivingLicenseDocument(driverId, drivingLicenseDetails);
  }

  @Put('driving-license/:documentId')
  @ApiOperation({ summary: 'Update driving license document' })
  @ApiParam({ name: 'documentId', description: 'Document ID', type: 'string' })
  @ApiBody({ type: DrivingLicenseDetailsDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Driving license document updated successfully',
    type: DriverDocumentResponseDto,
  })
  @SetRolesMetaData(Role.DRIVER)
  async updateDrivingLicenseDocument(
    @Param('documentId') documentId: string,
    @Body() drivingLicenseDetails: DrivingLicenseDetailsDto,
    @CurrentUser() user: User,
  ): Promise<DriverDocumentResponseDto> {
    const driverId = new Types.ObjectId(user._id);
    return await this.drivingLicenseDocumentService.updateDrivingLicenseDocument(
      documentId,
      driverId,
      drivingLicenseDetails,
    );
  }

  @Get('driving-license')
  @ApiOperation({ summary: 'Get driving license document' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Driving license document retrieved successfully',
    type: DriverDocumentResponseDto,
  })
  @SetRolesMetaData(Role.DRIVER)
  async getDrivingLicenseDocument(@CurrentUser() user: User): Promise<DriverDocumentResponseDto | null> {
    const driverId = new Types.ObjectId(user._id);
    return await this.drivingLicenseDocumentService.getDrivingLicenseDocument(driverId);
  }

  // ===== Taxi Permit Document Endpoints =====
  @Post('taxi-permit')
  @ApiOperation({ summary: 'Upload taxi permit document' })
  @ApiBody({ type: TaxiPermitDriverDetailsDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Taxi permit document uploaded successfully',
    type: DriverDocumentResponseDto,
  })
  @HttpCode(HttpStatus.CREATED)
  @SetRolesMetaData(Role.DRIVER)
  async uploadTaxiPermitDocument(
    @Body() taxiPermitDetails: TaxiPermitDriverDetailsDto,
    @CurrentUser() user: User,
  ): Promise<DriverDocumentResponseDto> {
    const driverId = new Types.ObjectId(user._id);
    return await this.taxiPermitDocumentService.uploadTaxiPermitDocument(driverId, taxiPermitDetails);
  }

  @Put('taxi-permit/:documentId')
  @ApiOperation({ summary: 'Update taxi permit document' })
  @ApiParam({ name: 'documentId', description: 'Document ID', type: 'string' })
  @ApiBody({ type: TaxiPermitDriverDetailsDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Taxi permit document updated successfully',
    type: DriverDocumentResponseDto,
  })
  @SetRolesMetaData(Role.DRIVER)
  async updateTaxiPermitDocument(
    @Param('documentId') documentId: string,
    @Body() taxiPermitDetails: TaxiPermitDriverDetailsDto,
    @CurrentUser() user: User,
  ): Promise<DriverDocumentResponseDto> {
    const driverId = new Types.ObjectId(user._id);
    return await this.taxiPermitDocumentService.updateTaxiPermitDocument(documentId, driverId, taxiPermitDetails);
  }

  @Get('taxi-permit')
  @ApiOperation({ summary: 'Get taxi permit document' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Taxi permit document retrieved successfully',
    type: DriverDocumentResponseDto,
  })
  @SetRolesMetaData(Role.DRIVER)
  async getTaxiPermitDocument(@CurrentUser() user: User): Promise<DriverDocumentResponseDto | null> {
    const driverId = new Types.ObjectId(user._id);
    return await this.taxiPermitDocumentService.getTaxiPermitDocument(driverId);
  }

  // ===== Document Verification Status Endpoints =====
  @Get('verification-status')
  @ApiOperation({ summary: 'Get document verification status summary' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document verification status retrieved successfully',
    type: DriverDocumentsSummaryDto,
  })
  @SetRolesMetaData(Role.DRIVER)
  async getDocumentVerificationStatus(@CurrentUser() user: User): Promise<DriverDocumentsSummaryDto> {
    const driverId = new Types.ObjectId(user._id);
    return await this.documentVerificationStatusService.getDocumentVerificationStatus(driverId);
  }

  @Get('compliance-report')
  @ApiOperation({ summary: 'Get detailed compliance report' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Detailed compliance report retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        driverId: { type: 'string' },
        overallComplianceStatus: {
          type: 'string',
          enum: ['compliant', 'non_compliant', 'pending', 'incomplete'],
        },
        compliancePercentage: { type: 'number' },
        requiredDocuments: {
          type: 'array',
          items: { $ref: '#/components/schemas/DetailedDocumentStatus' },
        },
        optionalDocuments: {
          type: 'array',
          items: { $ref: '#/components/schemas/DetailedDocumentStatus' },
        },
        blockers: { type: 'array', items: { type: 'string' } },
        warnings: { type: 'array', items: { type: 'string' } },
        recommendations: { type: 'array', items: { type: 'string' } },
        lastUpdated: { type: 'string', format: 'date-time' },
        nextReviewDate: { type: 'string', format: 'date-time' },
      },
    },
  })
  @SetRolesMetaData(Role.DRIVER)
  async getDetailedComplianceReport(@CurrentUser() user: User): Promise<ComplianceReport> {
    const driverId = new Types.ObjectId(user._id);
    return await this.documentVerificationStatusService.getDetailedComplianceReport(driverId);
  }

  @Get('missing')
  @ApiOperation({ summary: 'Get list of missing required documents' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Missing documents retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          documentType: { type: 'string', enum: Object.values(DocumentType) },
          isRequired: { type: 'boolean' },
          displayName: { type: 'string' },
          description: { type: 'string' },
          hasExpiry: { type: 'boolean' },
        },
      },
    },
  })
  @SetRolesMetaData(Role.DRIVER)
  async getMissingDocuments(@CurrentUser() user: User): Promise<DocumentRequirement[]> {
    const driverId = new Types.ObjectId(user._id);
    return await this.documentVerificationStatusService.getMissingDocuments(driverId);
  }

  @Get('rejected')
  @ApiOperation({ summary: 'Get list of rejected documents' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Rejected documents retrieved successfully',
    type: [DriverDocumentResponseDto],
  })
  async getRejectedDocuments(@CurrentUser() user: User): Promise<DriverDocumentResponseDto[]> {
    const driverId = new Types.ObjectId(user._id);
    return await this.documentVerificationStatusService.getRejectedDocuments(driverId);
  }

  @Get('expiring')
  @ApiOperation({ summary: 'Get list of expiring documents' })
  @ApiQuery({
    name: 'daysAhead',
    description: 'Number of days ahead to check for expiry',
    required: false,
    type: 'number',
    example: 30,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Expiring documents retrieved successfully',
    type: [DriverDocumentResponseDto],
  })
  async getExpiringDocuments(
    @Query('daysAhead', new ParseIntPipe({ optional: true })) daysAhead: number = 30,
    @CurrentUser() user: User,
  ): Promise<DriverDocumentResponseDto[]> {
    const driverId = new Types.ObjectId(user._id);
    return await this.documentVerificationStatusService.getExpiringDocuments(driverId, daysAhead);
  }

  @Get('requirements')
  @ApiOperation({ summary: 'Get document requirements' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document requirements retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          documentType: { type: 'string', enum: Object.values(DocumentType) },
          isRequired: { type: 'boolean' },
          displayName: { type: 'string' },
          description: { type: 'string' },
          hasExpiry: { type: 'boolean' },
        },
      },
    },
  })
  async getDocumentRequirements(): Promise<DocumentRequirement[]> {
    return await this.documentVerificationStatusService.getDocumentRequirements();
  }

  @Get('verification-check')
  @ApiOperation({ summary: 'Check if driver is fully verified' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Driver verification status checked successfully',
    schema: {
      type: 'object',
      properties: {
        isVerified: { type: 'boolean' },
        missingItems: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async isDriverFullyVerified(@CurrentUser() user: User): Promise<{ isVerified: boolean; missingItems: string[] }> {
    const driverId = new Types.ObjectId(user._id);
    return await this.documentVerificationStatusService.isDriverFullyVerified(driverId);
  }

  // ===== Utility Endpoints =====
  @Get('by-type/:documentType')
  @ApiOperation({ summary: 'Get document by type' })
  @ApiParam({
    name: 'documentType',
    description: 'Document type',
    enum: DocumentType,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document retrieved successfully',
    type: DriverDocumentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Document not found',
  })
  @SetRolesMetaData(Role.DRIVER)
  async getDocumentByType(
    @Param('documentType') documentType: DocumentType,
    @CurrentUser() user: User,
  ): Promise<DriverDocumentResponseDto | null> {
    const driverId = new Types.ObjectId(user._id);

    switch (documentType) {
      case DocumentType.NRIC:
        return await this.nricDocumentService.getNRICDocument(driverId);
      case DocumentType.PASSPORT:
        return await this.passportDocumentService.getPassportDocument(driverId);
      case DocumentType.PSV_LICENSE:
        return await this.psvLicenseDocumentService.getPSVLicenseDocument(driverId);
      case DocumentType.PAMANDU:
        return await this.pamanduDocumentService.getPamanduDocument(driverId);
      case DocumentType.DRIVING_LICENSE:
        return await this.drivingLicenseDocumentService.getDrivingLicenseDocument(driverId);
      case DocumentType.TAXI_PERMIT_DRIVER:
        return await this.taxiPermitDocumentService.getTaxiPermitDocument(driverId);
      default:
        return null;
    }
  }

  @Get('upload-progress')
  @ApiOperation({ summary: 'Get document upload progress' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document upload progress retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalRequired: { type: 'number' },
        uploaded: { type: 'number' },
        verified: { type: 'number' },
        rejected: { type: 'number' },
        pending: { type: 'number' },
        progressPercentage: { type: 'number' },
        nextStep: { type: 'string' },
        canProceed: { type: 'boolean' },
      },
    },
  })
  async getUploadProgress(@CurrentUser() user: User): Promise<{
    totalRequired: number;
    uploaded: number;
    verified: number;
    rejected: number;
    pending: number;
    progressPercentage: number;
    nextStep: string;
    canProceed: boolean;
  }> {
    const driverId = new Types.ObjectId(user._id);
    const summary = await this.documentVerificationStatusService.getDocumentVerificationStatus(driverId);
    const requirements = await this.documentVerificationStatusService.getDocumentRequirements();
    const requiredDocs = requirements.filter((req) => req.isRequired);

    const pending = summary.uploadedCount - summary.verifiedCount - summary.rejectedCount;
    const progressPercentage = Math.round((summary.verifiedCount / requiredDocs.length) * 100);

    let nextStep = '';
    let canProceed = false;

    if (summary.overallStatus === 'incomplete') {
      const missingDocs = await this.documentVerificationStatusService.getMissingDocuments(driverId);
      nextStep = `Upload ${missingDocs[0]?.displayName || 'missing documents'}`;
    } else if (summary.overallStatus === 'rejected') {
      nextStep = 'Re-upload rejected documents';
    } else if (summary.overallStatus === 'pending') {
      nextStep = 'Wait for document verification';
    } else if (summary.overallStatus === 'verified') {
      nextStep = 'All documents verified';
      canProceed = true;
    }

    return {
      totalRequired: requiredDocs.length,
      uploaded: summary.uploadedCount,
      verified: summary.verifiedCount,
      rejected: summary.rejectedCount,
      pending,
      progressPercentage,
      nextStep,
      canProceed,
    };
  }
}
