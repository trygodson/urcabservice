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
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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
import { DriverService } from './driver.service';
import {
  CreateSubscriptionTransactionDto,
  SubscriptionPlansListResponseDto,
  UpdateDriverStatusDto,
  GetSubscriptionTransactionsDto,
  SubscriptionTransactionsListResponseDto,
  GetEarningsDto,
  EarningsResponseDto,
} from './dto';

@ApiTags('Driver')
@UseGuards(JwtAuthGuard)
@Controller('driver')
@ApiBearerAuth()
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @UseInterceptors(ClassSerializerInterceptor)
  @Get('me')
  @SetRolesMetaData(Role.DRIVER)
  getProfile(@CurrentUser() user: User) {
    // console.log(user, '---user=----');
    return this.driverService.getUser({ _id: user._id });
  }

  @Put('me')
  @ApiOperation({ summary: 'Update driver profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @SetRolesMetaData(Role.DRIVER)
  async updateProfile(@CurrentUser() user: User, @Body() updateProfileDto: UpdateDriverProfileDto) {
    return await this.driverService.updateProfile(user._id.toString(), updateProfileDto);
  }

  @Put('fcmToken')
  @ApiOperation({ summary: 'Update fcm token' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @SetRolesMetaData(Role.DRIVER)
  async fcmToken(@CurrentUser() user: User, @Body() updateProfileDto: updateFCMDto) {
    return await this.driverService.updateFCMToken(user._id.toString(), updateProfileDto);
  }
  @Put('createSubscriptionTransaction')
  @ApiOperation({ summary: 'Update fcm token' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @SetRolesMetaData(Role.DRIVER)
  async createSubscriptionTransaction(
    @CurrentUser() user: User,
    @Body() createSubscriptionTransactionDto: CreateSubscriptionTransactionDto,
  ) {
    return await this.driverService.createSubscriptionTransaction(
      user._id.toString(),
      createSubscriptionTransactionDto,
    );
  }

  @Get('subscription-plans')
  @SetRolesMetaData(Role.DRIVER)
  @ApiOperation({ summary: 'Get all subscription plans with driver active subscription status' })
  @ApiResponse({
    status: 200,
    description: 'List of subscription plans with active subscription info',
    type: SubscriptionPlansListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSubscriptionPlans(@CurrentUser() user: User): Promise<SubscriptionPlansListResponseDto> {
    return await this.driverService.getSubscriptionPlans(user._id.toString());
  }

  @Post('notificationUrl')
  @Public()
  async notificationUrl(@Body() updateProfileDto: any) {
    // console.log(updateProfileDto, '---data from notificationUrl=----');

    return this.driverService.notificationUrl(updateProfileDto);
    // return await this.userService.updateFCMToken(user._id.toString(), updateProfileDto);
  }

  @Put('status')
  @SetRolesMetaData(Role.DRIVER)
  @ApiOperation({ summary: 'Update driver online/offline status' })
  @ApiResponse({ status: 200, description: 'Driver status updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async updateStatus(@CurrentUser() user: User, @Body() updateStatusDto: UpdateDriverStatusDto) {
    return await this.driverService.updateDriverStatus(user._id.toString(), updateStatusDto.status);
  }

  @Get('subscription-transactions')
  @SetRolesMetaData(Role.DRIVER)
  @ApiOperation({ summary: 'Get paginated subscription transaction history' })
  @ApiResponse({
    status: 200,
    description: 'Subscription transaction history retrieved successfully',
    type: SubscriptionTransactionsListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  async getSubscriptionTransactions(
    @CurrentUser() user: User,
    @Query() queryDto: GetSubscriptionTransactionsDto,
  ): Promise<SubscriptionTransactionsListResponseDto> {
    return await this.driverService.getSubscriptionTransactionHistory(user._id.toString(), queryDto);
  }

  @Get('earnings')
  @SetRolesMetaData(Role.DRIVER)
  @ApiOperation({ summary: 'Get driver earnings with histogram data and statistics' })
  @ApiResponse({
    status: 200,
    description: 'Driver earnings retrieved successfully',
    type: EarningsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async getEarnings(@CurrentUser() user: User, @Query() queryDto: GetEarningsDto): Promise<EarningsResponseDto> {
    return await this.driverService.getDriverEarnings(user._id.toString(), queryDto);
  }

  @Put('accept-consent')
  @SetRolesMetaData(Role.DRIVER)
  @ApiOperation({ summary: 'Accept consent for driver' })
  @ApiResponse({ status: 200, description: 'Consent updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async acceptConsent(@CurrentUser() user: User, @Body() acceptConsentDto: AcceptConsentDto) {
    return await this.driverService.acceptConsent(user._id.toString(), acceptConsentDto);
  }

  @Get('terms-and-conditions')
  @Public()
  @ApiOperation({ summary: 'Get terms and conditions for driver' })
  @ApiResponse({ status: 200, description: 'Terms and conditions retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Terms and conditions not found' })
  async getTermsAndConditions() {
    return await this.driverService.getTermsAndConditions();
  }

  @Put('change-password')
  @SetRolesMetaData(Role.DRIVER)
  @ApiOperation({ summary: 'Change password for driver' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Current password is incorrect' })
  @ApiResponse({ status: 400, description: 'Bad Request - New password must be different from current password' })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  async changePassword(@CurrentUser() user: User, @Body() changePasswordDto: ChangePasswordDto) {
    return await this.driverService.changePassword(user._id.toString(), changePasswordDto);
  }
}
