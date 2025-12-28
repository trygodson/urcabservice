import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { SubscriptionPlansService } from './subscription-plans.service';
import { CreateSubscriptionPlanDto, UpdateSubscriptionPlanDto, SubscriptionPlanResponseDto } from './dto';
import { JwtAdminAuthGuard, SetRolesMetaData, Role, SubscriptionType } from '@urcab-workspace/shared';

@ApiTags('Admin - Subscription Plans')
@Controller('admin/subscription-plans')
@UseGuards(JwtAdminAuthGuard)
@ApiBearerAuth()
export class SubscriptionPlansController {
  constructor(private readonly subscriptionPlansService: SubscriptionPlansService) {}

  @Post()
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Create a new subscription plan (Super Admin or Admin)' })
  @ApiResponse({ status: 201, description: 'Subscription plan created successfully', type: SubscriptionPlanResponseDto })
  @ApiResponse({ status: 409, description: 'A plan of this type already exists' })
  @ApiResponse({ status: 400, description: 'Invalid plan type or validity' })
  async create(@Body() createPlanDto: CreateSubscriptionPlanDto) {
    return this.subscriptionPlansService.create(createPlanDto);
  }

  @Get()
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get all subscription plans' })
  @ApiResponse({ status: 200, description: 'List of subscription plans', type: [SubscriptionPlanResponseDto] })
  async findAll() {
    return this.subscriptionPlansService.findAll();
  }

  @Get('active')
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get all active subscription plans' })
  @ApiResponse({ status: 200, description: 'List of active subscription plans', type: [SubscriptionPlanResponseDto] })
  async findActivePlans() {
    return this.subscriptionPlansService.findActivePlans();
  }

  @Get('type/:type')
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get subscription plan by type' })
  @ApiParam({ name: 'type', enum: SubscriptionType, description: 'Subscription type' })
  @ApiResponse({ status: 200, description: 'Subscription plan details', type: SubscriptionPlanResponseDto })
  @ApiResponse({ status: 404, description: 'Subscription plan not found' })
  async findByType(@Param('type') type: SubscriptionType) {
    return this.subscriptionPlansService.findByType(type);
  }

  @Get(':id')
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get a subscription plan by ID' })
  @ApiParam({ name: 'id', description: 'Subscription plan ID' })
  @ApiResponse({ status: 200, description: 'Subscription plan details', type: SubscriptionPlanResponseDto })
  @ApiResponse({ status: 404, description: 'Subscription plan not found' })
  async findOne(@Param('id') id: string) {
    return this.subscriptionPlansService.findOne(id);
  }

  @Patch(':id')
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Update a subscription plan (Super Admin or Admin)' })
  @ApiParam({ name: 'id', description: 'Subscription plan ID' })
  @ApiResponse({ status: 200, description: 'Subscription plan updated successfully', type: SubscriptionPlanResponseDto })
  @ApiResponse({ status: 404, description: 'Subscription plan not found' })
  async update(@Param('id') id: string, @Body() updatePlanDto: UpdateSubscriptionPlanDto) {
    return this.subscriptionPlansService.update(id, updatePlanDto);
  }

  @Delete(':id')
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a subscription plan (Super Admin or Admin)' })
  @ApiParam({ name: 'id', description: 'Subscription plan ID' })
  @ApiResponse({ status: 204, description: 'Subscription plan deleted successfully' })
  @ApiResponse({ status: 404, description: 'Subscription plan not found' })
  async remove(@Param('id') id: string) {
    await this.subscriptionPlansService.remove(id);
  }
}

