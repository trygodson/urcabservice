import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  BalanceType,
  generateRandomString,
  PaymentMethod,
  TransactionCategory,
  TransactionStatus,
  TransactionType,
  Wallet,
  WalletDocument,
  WalletRepository,
  WalletTransaction,
  WalletTransactionDocument,
} from '@urcab-workspace/shared';
import {
  CreateDepositDto,
  WalletBalanceResponseDto,
  TransactionResponseDto,
  QueryTransactionsDto,
  TransactionsListResponseDto,
} from './dto';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly walletRepository: WalletRepository,
    @InjectModel(Wallet.name) private readonly walletModel: Model<WalletDocument>,
    @InjectModel(WalletTransaction.name) private readonly transactionModel: Model<WalletTransactionDocument>,
  ) {}

  async getWalletBalance(userId: Types.ObjectId): Promise<WalletBalanceResponseDto> {
    try {
      // Get or create wallet for user
      let wallet = await this.walletRepository.findOne({ user: userId });
      if (!wallet) {
        // Create wallet if it doesn't exist
        wallet = await this.walletModel.create({
          _id: new Types.ObjectId(),
          user: userId,
          depositBalance: 0,
          withdrawableBalance: 0,
          totalBalance: 0,
          totalDeposited: 0,
          lastTransactionDate: new Date(),
        });
      }

      // Calculate balance from transactions
      // Sum of all CREDIT transactions minus all DEBIT transactions
      // where balanceType is DEPOSIT or WITHDRAWABLE and status is COMPLETED
      const walletId = typeof wallet._id === 'string' ? new Types.ObjectId(wallet._id) : wallet._id;

      // console.log(walletId, '=====walletId===', userId);
      const balanceResult = await this.transactionModel.aggregate([
        {
          $match: {
            user: userId,
            wallet: walletId,
            balanceType: { $in: [BalanceType.DEPOSIT, BalanceType.WITHDRAWABLE] },
            status: TransactionStatus.COMPLETED,
          },
        },
        {
          $group: {
            _id: null,
            totalCredits: {
              $sum: {
                $cond: [{ $eq: ['$type', `${TransactionType.CREDIT}`] }, '$amount', 0],
              },
            },
            totalDebits: {
              $sum: {
                $cond: [{ $eq: ['$type', `${TransactionType.DEBIT}`] }, '$amount', 0],
              },
            },
          },
        },
        {
          $project: {
            balance: { $subtract: ['$totalCredits', '$totalDebits'] },
          },
        },
      ]);
      console.log(balanceResult, '=====air===');
      const calculatedBalance = balanceResult.length > 0 ? balanceResult[0].balance : 0;

      return {
        balance: Math.max(0, calculatedBalance), // Ensure balance is not negative
        currencySymbol: wallet.currencySymbol || 'RM',
        currency: wallet.currency || 'MYR',
      };
    } catch (error) {
      this.logger.error(`Failed to get wallet balance for user ${userId}:`, error.stack);
      throw new BadRequestException('Failed to get wallet balance');
    }
  }

  async createDepositTransaction(userId: Types.ObjectId, createDepositDto: CreateDepositDto): Promise<any> {
    try {
      // Get or create wallet for user
      let wallet = await this.walletRepository.findOne({ user: userId });
      if (!wallet) {
        // Create wallet if it doesn't exist
        wallet = await this.walletModel.create({
          _id: new Types.ObjectId(),
          user: userId,
          depositBalance: 0,
          withdrawableBalance: 0,
          totalBalance: 0,
          totalDeposited: 0,
          lastTransactionDate: new Date(),
        });
      }

      // Generate transaction reference
      const transactionRef = this.generateTransactionRef(TransactionType.CREDIT, TransactionCategory.DEPOSIT);

      // Calculate new balances
      const withdrawableBalanceBefore = wallet.withdrawableBalance;
      const withdrawableBalanceAfter = withdrawableBalanceBefore + createDepositDto.amount;
      const totalBalanceAfter = wallet.depositBalance + withdrawableBalanceAfter;

      // Create transaction
      const transaction = new this.transactionModel({
        _id: new Types.ObjectId(),
        transactionRef,
        user: userId,
        wallet: typeof wallet._id === 'string' ? new Types.ObjectId(wallet._id) : wallet._id,
        type: TransactionType.CREDIT,
        status: TransactionStatus.PENDING,
        category: TransactionCategory.DEPOSIT,
        balanceType: BalanceType.WITHDRAWABLE,
        amount: createDepositDto.amount,
        currency: wallet.currency || 'MYR',
        currencySymbol: wallet.currencySymbol || 'RM',
        depositBalanceBefore: wallet.depositBalance,
        depositBalanceAfter: wallet.depositBalance, // No change for deposit
        withdrawableBalanceBefore,
        withdrawableBalanceAfter,
        totalBalanceBefore: wallet.totalBalance,
        totalBalanceAfter,
        paymentMethod: PaymentMethod.CARD,
        description: createDepositDto.description || `Wallet deposit - RM${createDepositDto.amount}`,
        reference: createDepositDto.reference || transactionRef,
        completedAt: new Date(),
      });

      await transaction.save();

      // Update wallet balances
      const walletId = typeof wallet._id === 'string' ? new Types.ObjectId(wallet._id) : wallet._id;
      await this.walletRepository.findOneAndUpdate(
        { _id: walletId },
        {
          withdrawableBalance: withdrawableBalanceAfter,
          totalBalance: totalBalanceAfter,
          totalDeposited: (wallet.totalDeposited || 0) + createDepositDto.amount,
          lastTransactionDate: new Date(),
        },
      );

      this.logger.log(
        `Created deposit transaction ${transactionRef} for user ${userId}. Amount: RM${createDepositDto.amount}`,
      );
      let ff = this.mapToTransactionResponse(transaction);
      return {
        success: true,
        message: 'Deposit transaction created successfully',
        data: ff,
      };
    } catch (error) {
      this.logger.error(`Failed to create deposit transaction for user ${userId}:`, error.stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create deposit transaction');
    }
  }

  async getWalletTransactions(
    userId: Types.ObjectId,
    queryDto: QueryTransactionsDto,
  ): Promise<TransactionsListResponseDto> {
    try {
      // Get or create wallet for user
      let wallet = await this.walletRepository.findOne({ user: userId });
      if (!wallet) {
        // Create wallet if it doesn't exist
        wallet = await this.walletModel.create({
          _id: new Types.ObjectId(),
          user: userId,
          depositBalance: 0,
          withdrawableBalance: 0,
          totalBalance: 0,
          totalDeposited: 0,
          lastTransactionDate: new Date(),
        });
      }

      const page = queryDto.page || 1;
      const limit = queryDto.limit || 10;
      const skip = (page - 1) * limit;

      const walletId = typeof wallet._id === 'string' ? new Types.ObjectId(wallet._id) : wallet._id;

      // Build filter
      const filter: any = {
        user: userId,
        wallet: walletId,
      };

      // Add optional filters
      if (queryDto.category) {
        filter.category = queryDto.category;
      }
      if (queryDto.status) {
        filter.status = queryDto.status;
      }
      if (queryDto.type !== undefined) {
        filter.type = queryDto.type;
      }

      // Get total count
      const total = await this.transactionModel.countDocuments(filter);

      // Get transactions with pagination
      const transactions = await this.transactionModel
        .find(filter)
        .sort({ createdAt: -1 }) // Most recent first
        .skip(skip)
        .limit(limit)
        .lean()
        .exec();

      // Map transactions to response DTOs
      const transactionResponses = transactions.map((tx) => this.mapToTransactionResponse(tx));

      // Calculate total pages
      const totalPages = Math.ceil(total / limit);

      return {
        transactions: transactionResponses,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      this.logger.error(`Failed to get wallet transactions for user ${userId}:`, error.stack);
      throw new BadRequestException('Failed to get wallet transactions');
    }
  }

  private generateTransactionRef(type: TransactionType, category: TransactionCategory): string {
    const prefix = type === TransactionType.CREDIT ? 'CR' : 'DB';
    const categoryCode = category.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = generateRandomString(4).toUpperCase();

    return `${prefix}${categoryCode}${timestamp}${random}`;
  }

  private mapToTransactionResponse(transaction: any): TransactionResponseDto {
    return {
      _id: transaction._id,
      transactionRef: transaction.transactionRef,
      user: transaction.user,
      wallet: transaction.wallet,
      type: transaction.type,
      category: transaction.category,
      balanceType: transaction.balanceType,
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency,
      currencySymbol: transaction.currencySymbol,
      depositBalanceBefore: transaction.depositBalanceBefore,
      depositBalanceAfter: transaction.depositBalanceAfter,
      withdrawableBalanceBefore: transaction.withdrawableBalanceBefore,
      withdrawableBalanceAfter: transaction.withdrawableBalanceAfter,
      totalBalanceBefore: transaction.totalBalanceBefore,
      totalBalanceAfter: transaction.totalBalanceAfter,
      description: transaction.description,
      reference: transaction.reference,
      metadata: transaction.metadata,
      createdAt: transaction.createdAt,
      completedAt: transaction.completedAt,
    };
  }
}
