import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
  UploadedFile,
  BadRequestException,
  Put,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import {
  CurrentUser,
  JwtAuthGuard,
  Public,
  Role,
  SetRolesMetaData,
  UpdateDriverProfileDto,
  updateFCMDto,
  AcceptConsentDto,
  ChangePasswordDto,
  UploadFileService,
  User,
} from '@urcab-workspace/shared';
import { FileUploadOptions } from '@urcab-workspace/shared';
import { GetFaqsDto, FaqsListResponseDto } from './dto';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService, private readonly uploadFileService: UploadFileService) {}

  // @UseInterceptors(ClassSerializerInterceptor)
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @SetRolesMetaData(Role.PASSENGER)
  getProfile(@CurrentUser() user: User) {
    // console.log(user, '---user=----');
    return this.userService.getUser({ _id: user._id });
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update driver profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @SetRolesMetaData(Role.PASSENGER)
  async updateProfile(@CurrentUser() user: User, @Body() updateProfileDto: UpdateDriverProfileDto) {
    return await this.userService.updateProfile(user._id.toString(), updateProfileDto);
  }

  @Put('fcmToken')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update fcm token' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @SetRolesMetaData(Role.PASSENGER)
  async fcmToken(@CurrentUser() user: User, @Body() updateProfileDto: updateFCMDto) {
    return await this.userService.updateFCMToken(user._id.toString(), updateProfileDto);
  }

  // @Post('returnUrl')
  // @Public()
  // async returnUrl(@Body() updateProfileDto: any) {
  //   console.log(updateProfileDto, '---data from returnUrl=----');

  //   return;
  //   // return await this.userService.updateFCMToken(user._id.toString(), updateProfileDto);
  // }

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
        // folder: {
        //   type: 'string',
        //   description: 'Optional folder name',
        // },
        // makePublic: {
        //   type: 'boolean',
        //   description: 'Make file public (default: true)',
        // },
      },
    },
  })
  // @SetRolesMetaData(Role.DRIVER, Role.PASSENGER)
  @UseInterceptors(FileInterceptor('file'))
  async uploadSingle(
    @UploadedFile() file: Express.Multer.File,
    // @Body() body: { folder?: string; makePublic?: boolean },
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const options: FileUploadOptions = {
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      // allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'],
      maxSize: 5 * 1024 * 1024, // 5MB
    };

    return this.uploadFileService.uploadFileCloudinary(file.buffer, file.originalname, file.mimetype, options);
  }

  @Get('privacy-policy')
  @Public()
  @ApiOperation({ summary: 'Get privacy policy' })
  @ApiResponse({ status: 200, description: 'Privacy policy retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Privacy policy not found' })
  async getPrivacyPolicy() {
    return await this.userService.getPrivacyPolicy();
  }

  @Get('terms-and-conditions')
  @Public()
  @ApiOperation({ summary: 'Get terms and conditions for passenger' })
  @ApiResponse({ status: 200, description: 'Terms and conditions retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Terms and conditions not found' })
  async getTermsAndConditions() {
    return await this.userService.getTermsAndConditions('PASSENGER');
  }

  @Get('faqs')
  @Public()
  @ApiOperation({ summary: 'Get paginated FAQs (only active ones)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search in question or answer' })
  @ApiQuery({
    name: 'category',
    required: false,
    type: String,
    description: 'Filter by category (e.g., Driver, Passenger, Booking)',
  })
  @ApiResponse({
    status: 200,
    description: 'FAQs retrieved successfully',
    type: FaqsListResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async getFaqs(@Query() query: GetFaqsDto) {
    return await this.userService.getFaqs(query);
  }

  @Put('accept-consent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accept consent for user' })
  @ApiResponse({ status: 200, description: 'Consent updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @SetRolesMetaData(Role.PASSENGER)
  async acceptConsent(@CurrentUser() user: User, @Body() acceptConsentDto: AcceptConsentDto) {
    return await this.userService.acceptConsent(user._id.toString(), acceptConsentDto);
  }

  @Put('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password for user' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Current password is incorrect' })
  @ApiResponse({ status: 400, description: 'Bad Request - New password must be different from current password' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @SetRolesMetaData(Role.PASSENGER)
  async changePassword(@CurrentUser() user: User, @Body() changePasswordDto: ChangePasswordDto) {
    return await this.userService.changePassword(user._id.toString(), changePasswordDto);
  }
}
