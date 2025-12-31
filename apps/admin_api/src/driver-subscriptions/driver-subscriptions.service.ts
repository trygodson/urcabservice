import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import {
  SubscriptionRepository,
  SubscriptionPlanRepository,
  UserRepository,
  SubscriptionStatus,
} from '@urcab-workspace/shared';
import { Types } from 'mongoose';
import * as XLSX from 'xlsx';

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

  async getAllSubscriptions(
    page: number = 1,
    limit: number = 10,
    status?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const skip = (page - 1) * limit;
    const filter: any = {
      type: { $ne: 'free' }, // Exclude free subscriptions
    };
    if (status) {
      filter.status = status;
    }

    // Date filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
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

  async exportSubscriptions(
    format: 'csv' | 'excel',
    startDate?: string,
    endDate?: string,
    status?: string,
  ) {
    const filter: any = {
      type: { $ne: 'free' }, // Exclude free subscriptions
    };

    if (status) {
      filter.status = status;
    }

    // Date filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // Get all subscriptions (no pagination for export)
    const subscriptions = await this.subscriptionRepository.find(filter, ['driverId', 'planId']);

    // Sort by createdAt descending
    subscriptions.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    // Prepare data for export
    const exportData = subscriptions.map((subscription) => {
      const mapped = this.mapToResponseDto(subscription);
      return {
        'Subscription ID': mapped._id,
        'Driver Name': mapped.driver?.fullName || 'N/A',
        'Driver Email': mapped.driver?.email || 'N/A',
        'Driver Phone': mapped.driver?.phone || 'N/A',
        'Plan Name': mapped.plan?.name || 'N/A',
        Type: mapped.type,
        Status: mapped.status,
        'Start Date': mapped.startDate ? new Date(mapped.startDate).toISOString().split('T')[0] : '',
        'End Date': mapped.endDate ? new Date(mapped.endDate).toISOString().split('T')[0] : '',
        Price: mapped.price,
        'Payment Method': mapped.paymentMethod || 'N/A',
        'Payment Reference': mapped.paymentReference || 'N/A',
        'Payment Date': mapped.paymentDate ? new Date(mapped.paymentDate).toISOString().split('T')[0] : '',
        'Rides Completed': mapped.ridesCompleted || 0,
        'Total Earnings': mapped.totalEarnings || 0,
        'Auto Renew': mapped.autoRenew ? 'Yes' : 'No',
        'Discount %': mapped.discountPercentage || 0,
        'Discount Reason': mapped.discountReason || '',
        'Created At': mapped.createdAt ? new Date(mapped.createdAt).toISOString() : '',
        'Updated At': mapped.updatedAt ? new Date(mapped.updatedAt).toISOString() : '',
      };
    });

    if (format === 'csv') {
      return this.generateCSV(exportData);
    } else {
      return this.generateExcel(exportData);
    }
  }

  private generateCSV(data: any[]): { buffer: Buffer; filename: string; mimeType: string } {
    if (data.length === 0) {
      throw new BadRequestException('No data to export');
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    // Add data rows
    for (const row of data) {
      const values = headers.map((header) => {
        const value = row[header];
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    }

    const csvContent = csvRows.join('\n');
    const buffer = Buffer.from(csvContent, 'utf-8');

    return {
      buffer,
      filename: `driver-subscriptions-${new Date().toISOString().split('T')[0]}.csv`,
      mimeType: 'text/csv',
    };
  }

  private generateExcel(data: any[]): { buffer: Buffer; filename: string; mimeType: string } {
    if (data.length === 0) {
      throw new BadRequestException('No data to export');
    }

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Driver Subscriptions');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return {
      buffer,
      filename: `driver-subscriptions-${new Date().toISOString().split('T')[0]}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }
}
