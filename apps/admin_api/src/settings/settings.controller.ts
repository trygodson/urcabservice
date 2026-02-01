import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Get,
  Patch,
  Body,
  UseGuards,
  Query,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import {
  FileUploadOptions,
  Public,
  UploadFileService,
  JwtAdminAuthGuard,
  SetRolesMetaData,
  Role,
} from '@urcab-workspace/shared';
import { SettingsService } from './settings.service';
import {
  UpdatePrivacyPolicyDto,
  UpdateTermsConditionsDto,
  UpdateEvpPriceDto,
  SettingsResponseDto,
  GetEvpTransactionsDto,
  EvpTransactionsListResponseDto,
  ExportFormat,
  Status,
} from './dto';

@ApiTags('Admin Settings')
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(
    private readonly uploadFileService: UploadFileService,
    private readonly settingsService: SettingsService,
  ) {}

  @Post('upload')
  @Public()
  @ApiOperation({ summary: 'Upload a single file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadSingle(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const options: FileUploadOptions = {
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      maxSize: 5 * 1024 * 1024, // 5MB
    };

    return this.uploadFileService.uploadFileCloudinary(file.buffer, file.originalname, file.mimetype, options);
  }

  @Get()
  @UseGuards(JwtAdminAuthGuard)
  @ApiBearerAuth()
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get settings' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully', type: SettingsResponseDto })
  async getSettings(): Promise<SettingsResponseDto> {
    return this.settingsService.getSettings();
  }

  @Patch('privacy-policy')
  @UseGuards(JwtAdminAuthGuard)
  @ApiBearerAuth()
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Update privacy policy' })
  @ApiResponse({ status: 200, description: 'Privacy policy updated successfully', type: SettingsResponseDto })
  async updatePrivacyPolicy(@Body() updateDto: UpdatePrivacyPolicyDto): Promise<SettingsResponseDto> {
    return this.settingsService.updatePrivacyPolicy(updateDto);
  }

  @Patch('terms-conditions')
  @UseGuards(JwtAdminAuthGuard)
  @ApiBearerAuth()
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Update Terms & Conditions for Passenger or Driver' })
  @ApiResponse({ status: 200, description: 'Terms & Conditions updated successfully', type: SettingsResponseDto })
  async updateTermsAndConditions(@Body() updateDto: UpdateTermsConditionsDto): Promise<SettingsResponseDto> {
    return this.settingsService.updateTermsAndConditions(updateDto);
  }

  @Patch('evp-price')
  @UseGuards(JwtAdminAuthGuard)
  @ApiBearerAuth()
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Update global vehicle EVP price' })
  @ApiResponse({ status: 200, description: 'EVP price updated successfully', type: SettingsResponseDto })
  async updateEvpPrice(@Body() updateDto: UpdateEvpPriceDto): Promise<SettingsResponseDto> {
    return this.settingsService.updateEvpPrice(updateDto);
  }

  @Get('evp-transactions')
  @UseGuards(JwtAdminAuthGuard)
  @ApiBearerAuth()
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get paginated EVP processing fee transactions' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: Status,
    type: String,
    description: 'Transaction status filter: PENDING, COMPLETED, FAILED',
  })
  // @ApiQuery({ name: 'paymentMethod', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'EVP transactions retrieved successfully',
    type: EvpTransactionsListResponseDto,
  })
  async getEvpTransactions(@Query() query: GetEvpTransactionsDto): Promise<EvpTransactionsListResponseDto> {
    return this.settingsService.getEvpTransactions(query);
  }

  @Get('evp-transactions/export')
  @UseGuards(JwtAdminAuthGuard)
  @ApiBearerAuth()
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Export EVP transactions to CSV or Excel' })
  @ApiQuery({ name: 'format', required: true, enum: ExportFormat, description: 'Export format: csv or excel' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: Status,
    // type: String,
    description: 'Transaction status filter: PENDING, COMPLETED, FAILED, PENDING_REVIEW',
  })
  // @ApiQuery({ name: 'paymentMethod', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Export file generated successfully' })
  async exportEvpTransactions(
    @Res() res: Response,
    @Query('format') format: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    // @Query('paymentMethod') paymentMethod?: string,
  ) {
    if (!format || (format !== ExportFormat.CSV && format !== ExportFormat.EXCEL)) {
      throw new BadRequestException('Invalid format. Must be "csv" or "excel"');
    }

    const exportResult = await this.settingsService.exportEvpTransactions(
      format as ExportFormat,
      startDate,
      endDate,
      status,
      // paymentMethod,
    );

    res.setHeader('Content-Type', exportResult.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
    res.send(exportResult.buffer);
  }
}
