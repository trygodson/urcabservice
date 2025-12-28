import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import {
  SubscriptionRepository,
  SubscriptionPlanRepository,
  UserRepository,
  SubscriptionStatus,
} from '@urcab-workspace/shared';
import { Types } from 'mongoose';

@Injectable()
export class DriverSubscriptionsService {
  private readonly logger = new Logger(DriverSubscriptionsService.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly subscriptionPlanRepository: SubscriptionPlanRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async createSubscription(createDto: any, adminId: string) {
    // Validate driver exists
    const driver = await this.userRepository.findById(createDto.driverId);
    if (!driver) {
      throw new NotFoundException(`Driver with ID ${createDto.driverId} not found`);
    }

    // Validate plan exists and is active
    const plan = await this.subscriptionPlanRepository.findById(createDto.planId);
    if (!plan) {
      throw new NotFoundException(`Subscription plan with ID ${createDto.planId} not found`);
    }

    if (plan.status !== 'active' || !plan.isActive) {
      throw new BadRequestException('Subscription plan is not active');
    }

    // Calculate dates
    const startDate = createDto.startDate ? new Date(createDto.startDate) : new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.validity);

    // Calculate final price with discount
    let finalPrice = plan.price;
    if (createDto.discountPercentage && createDto.discountPercentage > 0) {
      const discountAmount = (plan.price * createDto.discountPercentage) / 100;
      finalPrice = plan.price - discountAmount;
    }

    // Create subscription with current price from plan (captured at creation time)
    const subscription = await this.subscriptionRepository.createSubscription({
      driverId: new Types.ObjectId(createDto.driverId),
      planId: new Types.ObjectId(createDto.planId),
      type: plan.type,
      status: SubscriptionStatus.ACTIVE,
      startDate,
      endDate,
      price: finalPrice, // Capture current price from plan
      paymentMethod: createDto.paymentMethod,
      paymentReference: createDto.paymentReference,
      paymentDate: createDto.paymentDate ? new Date(createDto.paymentDate) : new Date(),
      approvedByAdminId: new Types.ObjectId(adminId),
      approvedAt: new Date(),
      autoRenew: createDto.autoRenew ?? true,
      discountPercentage: createDto.discountPercentage || 0,
      discountReason: createDto.discountReason,
      notes: createDto.notes,
      ridesCompleted: 0,
      totalEarnings: 0,
    });

    return this.mapToResponseDto(subscription);
  }

  async getDriverSubscriptions(driverId: string) {
    // Validate driver exists
    const driver = await this.userRepository.findById(driverId);
    if (!driver) {
      throw new NotFoundException(`Driver with ID ${driverId} not found`);
    }

    const subscriptions = await this.subscriptionRepository.findByDriverId(driverId);
    return subscriptions.map((sub) => this.mapToResponseDto(sub));
  }

  async getSubscriptionById(subscriptionId: string) {
    const subscription = await this.subscriptionRepository.findById(subscriptionId);
    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${subscriptionId} not found`);
    }
    return this.mapToResponseDto(subscription);
  }

  async getAllSubscriptions(page: number = 1, limit: number = 10, status?: string) {
    const skip = (page - 1) * limit;
    const filter: any = {
      type: { $ne: 'free' }, // Exclude free subscriptions
    };
    if (status) {
      filter.status = status;
    }

    // Get all subscriptions with pagination (excluding free plans)
    const allSubscriptions = await this.subscriptionRepository.find(filter, ['driverId', 'planId']);

    // Sort by createdAt descending
    allSubscriptions.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    // Apply pagination
    const paginatedSubscriptions = allSubscriptions.slice(skip, skip + limit);
    const total = allSubscriptions.length;

    return {
      data: paginatedSubscriptions.map((sub) => this.mapToResponseDto(sub)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async cancelSubscription(subscriptionId: string, reason: string, adminId: string) {
    const subscription = await this.subscriptionRepository.findById(subscriptionId);
    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${subscriptionId} not found`);
    }

    await this.subscriptionRepository.cancelSubscription(subscriptionId, reason, adminId);

    return { message: 'Subscription cancelled successfully' };
  }

  private mapToResponseDto(subscription: any) {
    return {
      _id: subscription._id.toString(),
      driver: {
        _id: subscription.driverId?._id?.toString(),
        fullName: subscription.driverId?.fullName,
        email: subscription.driverId?.email,
        phone: subscription.driverId?.phone,
      },
      plan: {
        _id: subscription.planId?._id?.toString(),
        name: subscription.planId?.name,
      },
      type: subscription.type,
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      price: subscription.price,
      paymentMethod: subscription.paymentMethod,
      paymentReference: subscription.paymentReference,
      paymentDate: subscription.paymentDate,
      approvedByAdminId: subscription.approvedByAdminId?.toString(),
      approvedAt: subscription.approvedAt,
      autoRenew: subscription.autoRenew,
      ridesCompleted: subscription.ridesCompleted,
      totalEarnings: subscription.totalEarnings,
      lastActiveDate: subscription.lastActiveDate,
      notes: subscription.notes,
      discountPercentage: subscription.discountPercentage,
      discountReason: subscription.discountReason,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    };
  }
}
