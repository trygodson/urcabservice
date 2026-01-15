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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import {
  FileUploadOptions,
  Public,
  UploadFileService,
  JwtAdminAuthGuard,
  SetRolesMetaData,
  Role,
} from '@urcab-workspace/shared';
import { SettingsService } from './settings.service';
import { UpdatePrivacyPolicyDto, UpdateTermsConditionsDto, UpdateEvpPriceDto, SettingsResponseDto } from './dto';

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
  @ApiOperation({ summary: 'Update Terms & Conditions' })
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
}
