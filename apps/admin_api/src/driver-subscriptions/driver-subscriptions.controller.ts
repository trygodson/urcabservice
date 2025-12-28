import { Controller, Get, Post, Body, Param, UseGuards, Query, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { DriverSubscriptionsService } from './driver-subscriptions.service';
import { CreateDriverSubscriptionDto, DriverSubscriptionResponseDto } from './dto';
import { JwtAdminAuthGuard, SetRolesMetaData, Role, CurrentUser } from '@urcab-workspace/shared';

@ApiTags('Admin - Driver Subscriptions')
@Controller('admin/driver-subscriptions')
@UseGuards(JwtAdminAuthGuard)
@ApiBearerAuth()
export class DriverSubscriptionsController {
  constructor(private readonly driverSubscriptionsService: DriverSubscriptionsService) {}

  // @Post()
  // @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  // @ApiOperation({ summary: 'Create a subscription for a driver (Super Admin or Admin)' })
  // @ApiResponse({ status: 201, description: 'Subscription created successfully', type: DriverSubscriptionResponseDto })
  // @ApiResponse({ status: 404, description: 'Driver or plan not found' })
  // @ApiResponse({ status: 400, description: 'Invalid subscription data' })
  // async create(@Body() createDto: CreateDriverSubscriptionDto, @CurrentUser() user: any) {
  //   return this.driverSubscriptionsService.createSubscription(createDto, user._id.toString());
  // }

  @Get()
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get all driver subscriptions with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'expired', 'suspended', 'cancelled'] })
  @ApiResponse({ status: 200, description: 'List of subscriptions' })
  async getAllSubscriptions(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.driverSubscriptionsService.getAllSubscriptions(
      page ? parseInt(page.toString()) : 1,
      limit ? parseInt(limit.toString()) : 10,
      status,
    );
  }

  @Get('driver/:driverId')
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get all subscriptions for a specific driver' })
  @ApiParam({ name: 'driverId', description: 'Driver ID' })
  @ApiResponse({ status: 200, description: 'List of driver subscriptions', type: [DriverSubscriptionResponseDto] })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  async getDriverSubscriptions(@Param('driverId') driverId: string) {
    return this.driverSubscriptionsService.getDriverSubscriptions(driverId);
  }

  @Get(':id')
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get a subscription by ID' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  @ApiResponse({ status: 200, description: 'Subscription details', type: DriverSubscriptionResponseDto })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async getSubscriptionById(@Param('id') id: string) {
    return this.driverSubscriptionsService.getSubscriptionById(id);
  }

  @Delete(':id/cancel')
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a subscription (Super Admin or Admin)' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  @ApiQuery({ name: 'reason', required: true, type: String, description: 'Cancellation reason' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async cancelSubscription(@Param('id') id: string, @Query('reason') reason: string, @CurrentUser() user: any) {
    return this.driverSubscriptionsService.cancelSubscription(id, reason, user._id.toString());
  }
}
