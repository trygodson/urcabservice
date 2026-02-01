import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Settings,
  SettingsDocument,
  WalletTransaction,
  WalletTransactionDocument,
  TransactionCategory,
  User,
  UserDocument,
} from '@urcab-workspace/shared';
import {
  UpdatePrivacyPolicyDto,
  UpdateTermsConditionsDto,
  UpdateEvpPriceDto,
  SettingsResponseDto,
  UserType,
  GetEvpTransactionsDto,
  EvpTransactionsListResponseDto,
  EvpTransactionResponseDto,
  ExportFormat,
} from './dto';
import * as XLSX from 'xlsx';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectModel(Settings.name) private readonly settingsModel: Model<SettingsDocument>,
    @InjectModel(WalletTransaction.name) private readonly transactionModel: Model<WalletTransactionDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  /**
   * Get or create settings document (singleton pattern)
   */
  private async getOrCreateSettings(): Promise<SettingsDocument> {
    let settings = await this.settingsModel.findOne().exec();

    if (!settings) {
      settings = await this.settingsModel.create({
        _id: new Types.ObjectId(),
        privacyPolicy: '',
        passengerTermsAndConditions: '',
        driverTermsAndConditions: '',
        globalVehicleEvpPrice: 0,
        globalVehicleEvpPeriod: 365, // Default to 1 year
      });
      this.logger.log('Created initial settings document');
    }

    return settings;
  }

  async getSettings(): Promise<SettingsResponseDto> {
    const settings = await this.getOrCreateSettings();

    return {
      _id: settings._id.toString(),
      privacyPolicy: settings.privacyPolicy || '',
      passengerTermsAndConditions: settings.passengerTermsAndConditions || '',
      driverTermsAndConditions: settings.driverTermsAndConditions || '',
      globalVehicleEvpPrice: settings.globalVehicleEvpPrice,
      globalVehicleEvpPeriod: settings.globalVehicleEvpPeriod,
      privacyPolicyLastUpdated: settings.privacyPolicyLastUpdated,
      passengerTermsAndConditionsLastUpdated: settings.passengerTermsAndConditionsLastUpdated,
      driverTermsAndConditionsLastUpdated: settings.driverTermsAndConditionsLastUpdated,
      evpPriceLastUpdated: settings.evpPriceLastUpdated,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }

  async updatePrivacyPolicy(updateDto: UpdatePrivacyPolicyDto): Promise<SettingsResponseDto> {
    const settings = await this.getOrCreateSettings();

    const updated = await this.settingsModel.findOneAndUpdate(
      { _id: settings._id },
      {
        privacyPolicy: updateDto.privacyPolicy,
        privacyPolicyLastUpdated: new Date(),
      },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException('Settings not found');
    }

    this.logger.log('Privacy policy updated');

    return {
      _id: updated._id.toString(),
      privacyPolicy: updated.privacyPolicy,
      passengerTermsAndConditions: updated.passengerTermsAndConditions || '',
      driverTermsAndConditions: updated.driverTermsAndConditions || '',
      globalVehicleEvpPrice: updated.globalVehicleEvpPrice,
      globalVehicleEvpPeriod: updated.globalVehicleEvpPeriod,
      privacyPolicyLastUpdated: updated.privacyPolicyLastUpdated,
      passengerTermsAndConditionsLastUpdated: updated.passengerTermsAndConditionsLastUpdated,
      driverTermsAndConditionsLastUpdated: updated.driverTermsAndConditionsLastUpdated,
      evpPriceLastUpdated: updated.evpPriceLastUpdated,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async updateTermsAndConditions(updateDto: UpdateTermsConditionsDto): Promise<SettingsResponseDto> {
    const settings = await this.getOrCreateSettings();

    const updateData: any = {};
    if (updateDto.userType === UserType.PASSENGER) {
      updateData.passengerTermsAndConditions = updateDto.termsAndConditions;
      updateData.passengerTermsAndConditionsLastUpdated = new Date();
    } else if (updateDto.userType === UserType.DRIVER) {
      updateData.driverTermsAndConditions = updateDto.termsAndConditions;
      updateData.driverTermsAndConditionsLastUpdated = new Date();
    }

    const updated = await this.settingsModel.findOneAndUpdate({ _id: settings._id }, updateData, { new: true });

    if (!updated) {
      throw new NotFoundException('Settings not found');
    }

    this.logger.log(`${updateDto.userType} Terms and Conditions updated`);

    return {
      _id: updated._id.toString(),
      privacyPolicy: updated.privacyPolicy,
      passengerTermsAndConditions: updated.passengerTermsAndConditions || '',
      driverTermsAndConditions: updated.driverTermsAndConditions || '',
      globalVehicleEvpPrice: updated.globalVehicleEvpPrice,
      globalVehicleEvpPeriod: updated.globalVehicleEvpPeriod,
      privacyPolicyLastUpdated: updated.privacyPolicyLastUpdated,
      passengerTermsAndConditionsLastUpdated: updated.passengerTermsAndConditionsLastUpdated,
      driverTermsAndConditionsLastUpdated: updated.driverTermsAndConditionsLastUpdated,
      evpPriceLastUpdated: updated.evpPriceLastUpdated,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async updateEvpPrice(updateDto: UpdateEvpPriceDto): Promise<SettingsResponseDto> {
    const settings = await this.getOrCreateSettings();

    const updated = await this.settingsModel.findOneAndUpdate(
      { _id: settings._id },
      {
        globalVehicleEvpPrice: updateDto.globalVehicleEvpPrice,
        globalVehicleEvpPeriod: updateDto.globalVehicleEvpPeriod,
        evpPriceLastUpdated: new Date(),
      },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException('Settings not found');
    }

    this.logger.log(
      `Global EVP price updated to ${updateDto.globalVehicleEvpPrice} with period of ${updateDto.globalVehicleEvpPeriod} days`,
    );

    return {
      _id: updated._id.toString(),
      privacyPolicy: updated.privacyPolicy,
      passengerTermsAndConditions: updated.passengerTermsAndConditions || '',
      driverTermsAndConditions: updated.driverTermsAndConditions || '',
      globalVehicleEvpPrice: updated.globalVehicleEvpPrice,
      globalVehicleEvpPeriod: updated.globalVehicleEvpPeriod,
      privacyPolicyLastUpdated: updated.privacyPolicyLastUpdated,
      passengerTermsAndConditionsLastUpdated: updated.passengerTermsAndConditionsLastUpdated,
      driverTermsAndConditionsLastUpdated: updated.driverTermsAndConditionsLastUpdated,
      evpPriceLastUpdated: updated.evpPriceLastUpdated,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Get global EVP price from settings
   */
  async getGlobalEvpPrice(): Promise<number> {
    const settings = await this.getOrCreateSettings();
    return settings.globalVehicleEvpPrice || 0;
  }

  /**
   * Get paginated EVP transactions
   */
  async getEvpTransactions(query: GetEvpTransactionsDto): Promise<EvpTransactionsListResponseDto> {
    const { page = 1, limit = 10, startDate, endDate, status } = query;
    const skip = (page - 1) * limit;

    // Build filter for EVP transactions
    const filter: any = {
      category: TransactionCategory.EVP_PAYMENT,
    };

    // Date filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        // Set end date to end of day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Payment method filter
    // if (paymentMethod) {
    //   filter.paymentMethod = paymentMethod;
    // }

    // Get total count
    const total = await this.transactionModel.countDocuments(filter);

    // Get transactions with pagination
    const transactions = await this.transactionModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    // Get unique driver IDs for batch fetching
    const driverIds = [...new Set(transactions.map((t) => (t.user ? t.user.toString() : null)).filter(Boolean))];

    // Fetch all drivers in batch
    const drivers = await this.userModel
      .find({ _id: { $in: driverIds.map((id) => new Types.ObjectId(id)) } })
      .select('_id fullName')
      .lean()
      .exec();

    // Create map for quick lookup
    const driverMap = new Map(drivers.map((d) => [d._id.toString(), d.fullName || 'Unknown']));

    // Enrich transactions with driver names
    const enrichedTransactions: EvpTransactionResponseDto[] = transactions.map((transaction) => {
      const driverId = transaction.user ? transaction.user.toString() : null;

      return {
        _id: transaction._id.toString(),
        transactionRef: transaction.transactionRef,
        driverName: driverId ? driverMap.get(driverId) || 'Unknown' : 'Unknown',
        amount: transaction.amount,
        paymentMethod: transaction.paymentMethod || 'N/A',
        date: transaction.createdAt,
        vehicleId: transaction.metadata?.vehicleId?.toString(),
      };
    });

    return {
      transactions: enrichedTransactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Export EVP transactions to CSV or Excel
   */
  async exportEvpTransactions(
    format: ExportFormat,
    startDate?: string,
    endDate?: string,
    status?: string,
    // paymentMethod?: string,
  ): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
    // Build filter (same as getEvpTransactions)
    const filter: any = {
      category: TransactionCategory.EVP_PAYMENT,
    };

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

    if (status) {
      filter.status = status;
    }

    // if (paymentMethod) {
    //   filter.paymentMethod = paymentMethod;
    // }

    // Get all transactions (no pagination for export)
    const transactions = await this.transactionModel.find(filter).sort({ createdAt: -1 }).lean().exec();

    // Get unique driver IDs
    const driverIds = [...new Set(transactions.map((t) => (t.user ? t.user.toString() : null)).filter(Boolean))];

    // Fetch all drivers in one query
    const drivers = await this.userModel
      .find({ _id: { $in: driverIds.map((id) => new Types.ObjectId(id)) } })
      .select('_id fullName')
      .lean()
      .exec();

    // Create map for quick lookup
    const driverMap = new Map(drivers.map((d) => [d._id.toString(), d.fullName || 'Unknown']));

    // Prepare data for export
    const exportData = transactions.map((transaction) => {
      const driverId = transaction.user ? transaction.user.toString() : null;

      return {
        'Transaction ID': transaction._id.toString(),
        'Transaction Ref': transaction.transactionRef,
        'Driver Name': driverId ? driverMap.get(driverId) || 'Unknown' : 'Unknown',
        Amount: transaction.amount,
        'Payment Method': transaction.paymentMethod || 'N/A',
        Date: transaction.createdAt ? new Date(transaction.createdAt).toISOString() : '',
        'Vehicle ID': transaction.metadata?.vehicleId?.toString() || '',
      };
    });

    if (format === ExportFormat.CSV) {
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
      filename: `evp-transactions-${new Date().toISOString().split('T')[0]}.csv`,
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
    XLSX.utils.book_append_sheet(workbook, worksheet, 'EVP Transactions');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return {
      buffer,
      filename: `evp-transactions-${new Date().toISOString().split('T')[0]}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }
}
