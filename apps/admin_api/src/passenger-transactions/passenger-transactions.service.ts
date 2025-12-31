import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Types } from 'mongoose';
import {
  WalletTransaction,
  WalletTransactionDocument,
  TransactionCategory,
  User,
  UserDocument,
  Ride,
  RideDocument,
} from '@urcab-workspace/shared';
import { GetPassengerTransactionsDto, ExportFormat } from './dto';
import * as XLSX from 'xlsx';

@Injectable()
export class PassengerTransactionsService {
  private readonly logger = new Logger(PassengerTransactionsService.name);

  constructor(
    @InjectModel(WalletTransaction.name)
    private readonly transactionModel: Model<WalletTransactionDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Ride.name)
    private readonly rideModel: Model<RideDocument>,
  ) {}

  async getPassengerTransactions(query: GetPassengerTransactionsDto) {
    const { page = 1, limit = 10, startDate, endDate, status, paymentMethod } = query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = {
      category: TransactionCategory.RIDE,
      'metadata.passengerId': { $exists: true },
      'metadata.rideId': { $exists: true },
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
    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }

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

    // Get unique passenger and driver IDs for batch fetching
    const passengerIds = [
      ...new Set(transactions.map((t) => t.metadata?.passengerId).filter(Boolean)),
    ];
    const driverIds = [
      ...new Set(transactions.map((t) => (t.user ? t.user.toString() : null)).filter(Boolean)),
    ];

    // Fetch all users in batch
    const [passengers, drivers] = await Promise.all([
      this.userModel
        .find({ _id: { $in: passengerIds.map((id) => new Types.ObjectId(id)) } })
        .select('_id fullName')
        .lean()
        .exec(),
      this.userModel
        .find({ _id: { $in: driverIds.map((id) => new Types.ObjectId(id)) } })
        .select('_id fullName')
        .lean()
        .exec(),
    ]);

    // Create maps for quick lookup
    const passengerMap = new Map(passengers.map((p) => [p._id.toString(), p.fullName || 'Unknown']));
    const driverMap = new Map(drivers.map((d) => [d._id.toString(), d.fullName || 'N/A']));

    // Enrich transactions with passenger and driver names
    const enrichedTransactions = transactions.map((transaction) => {
      const passengerId = transaction.metadata?.passengerId;
      const driverId = transaction.user ? transaction.user.toString() : null;
      const rideId = transaction.metadata?.rideId;

      return {
        _id: transaction._id.toString(),
        transactionRef: transaction.transactionRef,
        status: transaction.status,
        paymentMethod: transaction.paymentMethod || 'N/A',
        passengerName: passengerId ? passengerMap.get(passengerId) || 'Unknown' : 'Unknown',
        amount: transaction.amount,
        driverName: driverId ? driverMap.get(driverId) || 'N/A' : 'N/A',
        date: transaction.createdAt,
        rideId: rideId?.toString(),
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

  async exportPassengerTransactions(
    format: ExportFormat,
    startDate?: string,
    endDate?: string,
    status?: string,
    paymentMethod?: string,
  ) {
    // Build filter (same as getPassengerTransactions)
    const filter: any = {
      category: TransactionCategory.RIDE,
      'metadata.passengerId': { $exists: true },
      'metadata.rideId': { $exists: true },
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

    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }

    // Get all transactions (no pagination for export)
    const transactions = await this.transactionModel.find(filter).sort({ createdAt: -1 }).lean().exec();

    // Get unique passenger and driver IDs
    const passengerIds = [...new Set(transactions.map((t) => t.metadata?.passengerId).filter(Boolean))];
    const driverIds = [
      ...new Set(transactions.map((t) => (t.user ? t.user.toString() : null)).filter(Boolean)),
    ];

    // Fetch all users in one query
    const [passengers, drivers] = await Promise.all([
      this.userModel
        .find({ _id: { $in: passengerIds.map((id) => new Types.ObjectId(id)) } })
        .select('_id fullName')
        .lean()
        .exec(),
      this.userModel
        .find({ _id: { $in: driverIds.map((id) => new Types.ObjectId(id)) } })
        .select('_id fullName')
        .lean()
        .exec(),
    ]);

    // Create maps for quick lookup
    const passengerMap = new Map(passengers.map((p) => [p._id.toString(), p.fullName || 'Unknown']));
    const driverMap = new Map(drivers.map((d) => [d._id.toString(), d.fullName || 'N/A']));

    // Prepare data for export
    const exportData = transactions.map((transaction) => {
      const passengerId = transaction.metadata?.passengerId;
      const driverId = transaction.user ? transaction.user.toString() : null;

      return {
        'Transaction Ref': transaction.transactionRef,
        Status: transaction.status,
        'Payment Method': transaction.paymentMethod || 'N/A',
        'Passenger Name': passengerId ? passengerMap.get(passengerId) || 'Unknown' : 'Unknown',
        Amount: transaction.amount,
        'Driver Name': driverId ? driverMap.get(driverId) || 'N/A' : 'N/A',
        Date: transaction.createdAt ? new Date(transaction.createdAt).toISOString() : '',
        'Ride ID': transaction.metadata?.rideId || '',
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
      filename: `passenger-transactions-${new Date().toISOString().split('T')[0]}.csv`,
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
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Passenger Transactions');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return {
      buffer,
      filename: `passenger-transactions-${new Date().toISOString().split('T')[0]}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }
}

