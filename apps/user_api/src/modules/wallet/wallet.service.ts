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
  BankAccount,
  BankAccountDocument,
  WithdrawalRequest,
  WithdrawalRequestDocument,
  WithdrawalRequestStatus,
} from '@urcab-workspace/shared';
import {
  CreateDepositDto,
  WalletBalanceResponseDto,
  TransactionResponseDto,
  QueryTransactionsDto,
  TransactionsListResponseDto,
  CreateBankAccountDto,
  UpdateBankAccountDto,
  CreateWithdrawalRequestDto,
} from './dto';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly walletRepository: WalletRepository,
    @InjectModel(Wallet.name) private readonly walletModel: Model<WalletDocument>,
    @InjectModel(WalletTransaction.name) private readonly transactionModel: Model<WalletTransactionDocument>,
    @InjectModel(BankAccount.name) private readonly bankAccountModel: Model<BankAccountDocument>,
    @InjectModel(WithdrawalRequest.name) private readonly withdrawalRequestModel: Model<WithdrawalRequestDocument>,
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
      // where balanceType is DEPOSIT or WITHDRAWABLE
      const walletId = typeof wallet._id === 'string' ? new Types.ObjectId(wallet._id) : wallet._id;

      // Calculate balance from COMPLETED transactions only
      const completedBalanceResult = await this.transactionModel.aggregate([
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

      // Calculate balance from both COMPLETED and PENDING transactions
      const allBalanceResult = await this.transactionModel.aggregate([
        {
          $match: {
            user: userId,
            wallet: walletId,
            balanceType: { $in: [BalanceType.DEPOSIT, BalanceType.WITHDRAWABLE] },
            status: { $in: [TransactionStatus.COMPLETED, TransactionStatus.PENDING] },
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

      const completedBalance = completedBalanceResult.length > 0 ? completedBalanceResult[0].balance : 0;
      const availableBalance = allBalanceResult.length > 0 ? allBalanceResult[0].balance : 0;

      return {
        balance: Math.max(0, completedBalance), // Completed transactions balance
        availableBalance: Math.max(0, availableBalance), // Balance including pending transactions
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

  // Bank Account methods
  async createBankAccount(userId: Types.ObjectId, createDto: CreateBankAccountDto): Promise<any> {
    try {
      // If setting as default, unset other defaults
      if (createDto.isDefault) {
        await this.bankAccountModel.updateMany({ user: userId }, { $set: { isDefault: false } });
      }

      const bankAccount = new this.bankAccountModel({
        _id: new Types.ObjectId(),
        user: userId,
        ...createDto,
        isDefault: createDto.isDefault || false,
        isActive: true,
      });

      await bankAccount.save();

      this.logger.log(`Created bank account ${bankAccount._id} for user ${userId}`);

      return {
        success: true,
        message: 'Bank account created successfully',
        data: bankAccount,
      };
    } catch (error) {
      this.logger.error(`Failed to create bank account for user ${userId}:`, error.stack);
      throw new BadRequestException('Failed to create bank account');
    }
  }

  async getBankAccounts(userId: Types.ObjectId): Promise<any> {
    try {
      const bankAccounts = await this.bankAccountModel
        .find({ user: userId, isActive: true })
        .sort({ isDefault: -1, createdAt: -1 })
        .lean()
        .exec();

      return {
        success: true,
        data: bankAccounts,
      };
    } catch (error) {
      this.logger.error(`Failed to get bank accounts for user ${userId}:`, error.stack);
      throw new BadRequestException('Failed to get bank accounts');
    }
  }

  async getDefaultBankAccount(userId: Types.ObjectId): Promise<BankAccountDocument | null> {
    try {
      return await this.bankAccountModel.findOne({ user: userId, isDefault: true, isActive: true });
    } catch (error) {
      this.logger.error(`Failed to get default bank account for user ${userId}:`, error.stack);
      return null;
    }
  }

  async updateBankAccount(userId: Types.ObjectId, accountId: string, updateDto: UpdateBankAccountDto): Promise<any> {
    try {
      const bankAccount = await this.bankAccountModel.findOne({
        _id: new Types.ObjectId(accountId),
        user: userId,
      });

      if (!bankAccount) {
        throw new NotFoundException('Bank account not found');
      }

      // If setting as default, unset other defaults
      if (updateDto.isDefault) {
        await this.bankAccountModel.updateMany(
          { user: userId, _id: { $ne: new Types.ObjectId(accountId) } },
          { $set: { isDefault: false } },
        );
      }

      Object.assign(bankAccount, updateDto);
      await bankAccount.save();

      return {
        success: true,
        message: 'Bank account updated successfully',
        data: bankAccount,
      };
    } catch (error) {
      this.logger.error(`Failed to update bank account ${accountId}:`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to update bank account');
    }
  }

  async deleteBankAccount(userId: Types.ObjectId, accountId: string): Promise<any> {
    try {
      const bankAccount = await this.bankAccountModel.findOne({
        _id: new Types.ObjectId(accountId),
        user: userId,
      });

      if (!bankAccount) {
        throw new NotFoundException('Bank account not found');
      }

      // Don't allow deleting default account if it's the only one
      const activeAccounts = await this.bankAccountModel.countDocuments({
        user: userId,
        isActive: true,
      });

      if (bankAccount.isDefault && activeAccounts === 1) {
        throw new BadRequestException('Cannot delete the only active bank account');
      }

      bankAccount.isActive = false;
      await bankAccount.save();

      // If deleted account was default, set another as default
      if (bankAccount.isDefault) {
        const newDefault = await this.bankAccountModel.findOne({
          user: userId,
          isActive: true,
          _id: { $ne: new Types.ObjectId(accountId) },
        });
        if (newDefault) {
          newDefault.isDefault = true;
          await newDefault.save();
        }
      }

      return {
        success: true,
        message: 'Bank account deleted successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to delete bank account ${accountId}:`, error.stack);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete bank account');
    }
  }

  // Withdrawal request method
  async createWithdrawalRequest(userId: Types.ObjectId, createWithdrawalDto: CreateWithdrawalRequestDto): Promise<any> {
    try {
      // Get or create wallet for user
      let wallet = await this.walletRepository.findOne({ user: userId });
      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      // Get bank account (use provided ID or default)
      let bankAccount: BankAccountDocument | null;
      if (createWithdrawalDto.bankAccountId) {
        bankAccount = await this.bankAccountModel.findOne({
          _id: new Types.ObjectId(createWithdrawalDto.bankAccountId),
          user: userId,
          isActive: true,
        });
        if (!bankAccount) {
          throw new NotFoundException('Bank account not found');
        }
      } else {
        bankAccount = await this.getDefaultBankAccount(userId);
        if (!bankAccount) {
          throw new BadRequestException('No default bank account found. Please add a bank account first.');
        }
      }

      // Check if user has sufficient balance
      const balanceResult = await this.transactionModel.aggregate([
        {
          $match: {
            user: userId,
            wallet: typeof wallet._id === 'string' ? new Types.ObjectId(wallet._id) : wallet._id,
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

      const availableBalance = balanceResult.length > 0 ? balanceResult[0].balance : 0;

      if (availableBalance < createWithdrawalDto.amount) {
        throw new BadRequestException('Insufficient balance for withdrawal');
      }

      // Check for pending withdrawal requests
      const pendingRequest = await this.withdrawalRequestModel.findOne({
        user: userId,
        status: WithdrawalRequestStatus.PENDING,
      });

      if (pendingRequest) {
        throw new BadRequestException('You already have a pending withdrawal request');
      }

      // Get current wallet balances for transaction
      const walletId = typeof wallet._id === 'string' ? new Types.ObjectId(wallet._id) : wallet._id;
      const withdrawableBalanceBefore = wallet.withdrawableBalance;
      const withdrawableBalanceAfter = withdrawableBalanceBefore; // No change until approved
      const totalBalanceBefore = wallet.totalBalance;
      const totalBalanceAfter = totalBalanceBefore; // No change until approved

      // Generate transaction reference
      const transactionRef = this.generateTransactionRef(TransactionType.DEBIT, TransactionCategory.WITHDRAWAL);

      // Create PENDING wallet transaction
      const transaction = new this.transactionModel({
        _id: new Types.ObjectId(),
        transactionRef,
        user: userId,
        wallet: walletId,
        type: TransactionType.DEBIT,
        status: TransactionStatus.PENDING,
        category: TransactionCategory.WITHDRAWAL,
        balanceType: BalanceType.WITHDRAWABLE,
        amount: createWithdrawalDto.amount,
        currency: wallet.currency || 'MYR',
        currencySymbol: wallet.currencySymbol || 'RM',
        depositBalanceBefore: wallet.depositBalance,
        depositBalanceAfter: wallet.depositBalance,
        withdrawableBalanceBefore,
        withdrawableBalanceAfter,
        totalBalanceBefore,
        totalBalanceAfter,
        description: `Withdrawal request - ${wallet.currencySymbol}${createWithdrawalDto.amount}`,
        reference: transactionRef,
        metadata: {
          bankAccountId: bankAccount._id.toString(),
          bankName: bankAccount.bankName,
          accountNumber: bankAccount.accountNumber,
          accountName: bankAccount.accountName,
        },
      });

      await transaction.save();

      // Create withdrawal request and link to transaction
      const withdrawalRequest = new this.withdrawalRequestModel({
        _id: new Types.ObjectId(),
        user: userId,
        wallet: walletId,
        bankAccount: bankAccount._id,
        amount: createWithdrawalDto.amount,
        currency: wallet.currency || 'MYR',
        currencySymbol: wallet.currencySymbol || 'RM',
        status: WithdrawalRequestStatus.PENDING,
        notes: createWithdrawalDto.notes,
        transactionId: transaction._id, // Link to the pending transaction
      });

      await withdrawalRequest.save();

      this.logger.log(
        `Created withdrawal request ${withdrawalRequest._id} for user ${userId}. Amount: ${wallet.currencySymbol}${createWithdrawalDto.amount}`,
      );

      return {
        success: true,
        message: 'Withdrawal request created successfully',
        data: {
          _id: withdrawalRequest._id,
          amount: withdrawalRequest.amount,
          status: withdrawalRequest.status,
          bankAccount: {
            _id: bankAccount._id,
            bankName: bankAccount.bankName,
            accountNumber: bankAccount.accountNumber,
            accountName: bankAccount.accountName,
          },
          createdAt: withdrawalRequest.createdAt,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to create withdrawal request for user ${userId}:`, error.stack);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to create withdrawal request');
    }
  }
}
