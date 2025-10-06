import { Controller, Get, Post, Put, Body, Param, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { JwtAuthGuard, Role, CurrentUser, User, SetRolesMetaData, DocumentType } from '@urcab-workspace/shared';

import { NRICDetailsPassengerDto, PassportDetailsDto, UserDocumentResponseDto, UserDocumentsSummaryDto } from './dto';
import { NRICVerificationService } from './nricVerificationService';
import { PassportVerificationService } from './passportVerification.service';
import { DocumentVerificationStatusService } from './documentVerificationStatus.service';

@ApiTags('User Documents')
@Controller('user/documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserDocumentController {
  constructor(
    private readonly nricVerificationService: NRICVerificationService,
    private readonly passportVerificationService: PassportVerificationService,
    private readonly documentVerificationStatusService: DocumentVerificationStatusService,
  ) {}

  // NRIC Document Endpoints
  @Post('nric')
  @ApiOperation({ summary: 'Upload NRIC document' })
  @ApiBody({ type: NRICDetailsPassengerDto })
  @HttpCode(HttpStatus.CREATED)
  @SetRolesMetaData(Role.PASSENGER)
  async uploadNRICDocument(@Body() nricDetails: NRICDetailsPassengerDto, @CurrentUser() user: User): Promise<any> {
    const userId = new Types.ObjectId(user._id);
    return await this.nricVerificationService.uploadNRICDocument(userId, nricDetails);
  }

  @Get('nric')
  @ApiOperation({ summary: 'Get NRIC document' })
  @SetRolesMetaData(Role.PASSENGER)
  async getNRICDocument(@CurrentUser() user: User): Promise<any | null> {
    const userId = new Types.ObjectId(user._id);
    return await this.nricVerificationService.getNRICDocument(userId);
  }

  @Post('passport')
  @ApiOperation({ summary: 'Upload passport document' })
  @ApiBody({ type: PassportDetailsDto })
  @HttpCode(HttpStatus.CREATED)
  @SetRolesMetaData(Role.PASSENGER)
  async uploadPassportDocument(@Body() passportDetails: PassportDetailsDto, @CurrentUser() user: User): Promise<any> {
    const userId = new Types.ObjectId(user._id);
    return await this.passportVerificationService.uploadPassportDocument(userId, passportDetails);
  }

  @Get('passport')
  @ApiOperation({ summary: 'Get passport document' })
  @SetRolesMetaData(Role.PASSENGER)
  async getPassportDocument(@CurrentUser() user: User): Promise<any | null> {
    const userId = new Types.ObjectId(user._id);
    return await this.passportVerificationService.getPassportDocument(userId);
  }

  @Put('nric/:documentId')
  @ApiOperation({ summary: 'Update NRIC document' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @SetRolesMetaData(Role.PASSENGER)
  async updateNRICDocument(
    @Param('documentId') documentId: string,
    @Body() nricDetails: NRICDetailsPassengerDto,
    @CurrentUser() user: User,
  ): Promise<any> {
    const userId = new Types.ObjectId(user._id);
    return await this.nricVerificationService.updateNRICDocument(documentId, userId, nricDetails);
  }

  // Passport Document Endpoints

  @Put('passport/:documentId')
  @ApiOperation({ summary: 'Update passport document' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @SetRolesMetaData(Role.PASSENGER)
  async updatePassportDocument(
    @Param('documentId') documentId: string,
    @Body() passportDetails: PassportDetailsDto,
    @CurrentUser() user: User,
  ): Promise<any> {
    const userId = new Types.ObjectId(user._id);
    return await this.passportVerificationService.updatePassportDocument(documentId, userId, passportDetails);
  }

  // Verification Status Endpoints
  @Get('verification-status')
  @ApiOperation({ summary: 'Get document verification status' })
  @SetRolesMetaData(Role.PASSENGER)
  async getVerificationStatus(@CurrentUser() user: User): Promise<any> {
    const userId = new Types.ObjectId(user._id);
    return await this.documentVerificationStatusService.getVerificationStatus(userId);
  }
}
