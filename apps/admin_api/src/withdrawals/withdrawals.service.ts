import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  WithdrawalRequest,
  WithdrawalRequestDocument,
  WithdrawalRequestStatus,
  WalletRepository,
  WalletTransaction,
  WalletTransactionDocument,
  TransactionType,
  TransactionCategory,
  TransactionStatus,
  BalanceType,
  generateRandomString,
} from '@urcab-workspace/shared';
import { ApproveWithdrawalDto, RejectWithdrawalDto } from './dto';

@Injectable()
export class WithdrawalsService {
  private readonly logger = new Logger(WithdrawalsService.name);

  constructor(
    @InjectModel(WithdrawalRequest.name) private readonly withdrawalRequestModel: Model<WithdrawalRequestDocument>,
    @InjectModel(WalletTransaction.name) private readonly transactionModel: Model<WalletTransactionDocument>,
    private readonly walletRepository: WalletRepository,
  ) {}

  async approveWithdrawalRequest(requestId: string, adminId: string, approveDto: ApproveWithdrawalDto): Promise<any> {
    const withdrawalRequest = await this.withdrawalRequestModel
      .findById(requestId)
      .populate('user', 'fullName email phone')
      .populate('wallet')
      .populate('bankAccount');

    if (!withdrawalRequest) {
      throw new NotFoundException('Withdrawal request not found');
    }

    if (withdrawalRequest.status !== WithdrawalRequestStatus.PENDING) {
      throw new BadRequestException(`Cannot approve withdrawal request with status: ${withdrawalRequest.status}`);
    }

    // Get wallet
    const wallet = await this.walletRepository.findById(withdrawalRequest.wallet.toString());
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Check balance again (excluding the pending transaction for this withdrawal request)
    const balanceResult = await this.transactionModel.aggregate([
      {
        $match: {
          user: withdrawalRequest.user,
          wallet: withdrawalRequest.wallet,
          balanceType: { $in: [BalanceType.DEPOSIT, BalanceType.WITHDRAWABLE] },
          status: TransactionStatus.COMPLETED,
          // Exclude the pending transaction for this withdrawal request
          _id: { $ne: withdrawalRequest.transactionId },
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

    if (availableBalance < withdrawalRequest.amount) {
      throw new BadRequestException('Insufficient balance for withdrawal');
    }

    // Get the existing pending transaction
    if (!withdrawalRequest.transactionId) {
      throw new BadRequestException('Withdrawal request does not have an associated transaction');
    }

    const transaction = await this.transactionModel.findById(withdrawalRequest.transactionId);
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      throw new BadRequestException(`Transaction is not in PENDING status. Current status: ${transaction.status}`);
    }

    // Calculate new balances
    const withdrawableBalanceBefore = wallet.withdrawableBalance;
    const withdrawableBalanceAfter = Math.max(0, withdrawableBalanceBefore - withdrawalRequest.amount);
    const totalBalanceAfter = wallet.totalBalance - withdrawalRequest.amount;

    // Get bank account details
    const bankAccount = withdrawalRequest.bankAccount as any;

    // Update the existing transaction to COMPLETED
    transaction.status = TransactionStatus.COMPLETED;
    transaction.withdrawableBalanceBefore = withdrawableBalanceBefore;
    transaction.withdrawableBalanceAfter = withdrawableBalanceAfter;
    transaction.totalBalanceBefore = wallet.totalBalance;
    transaction.totalBalanceAfter = totalBalanceAfter;
    transaction.description = `Withdrawal - ${withdrawalRequest.currencySymbol}${withdrawalRequest.amount}`;
    transaction.completedAt = new Date();
    transaction.metadata = {
      ...transaction.metadata,
      withdrawalRequestId: withdrawalRequest._id.toString(),
      bankAccountId: bankAccount?._id?.toString(),
      bankName: bankAccount?.bankName,
      accountNumber: bankAccount?.accountNumber,
      accountName: bankAccount?.accountName,
    };

    await transaction.save();

    // Update wallet balances
    await this.walletRepository.findOneAndUpdate(
      { _id: withdrawalRequest.wallet },
      {
        withdrawableBalance: withdrawableBalanceAfter,
        totalBalance: totalBalanceAfter,
        lastTransactionDate: new Date(),
      },
    );

    // Update withdrawal request
    withdrawalRequest.status = WithdrawalRequestStatus.APPROVED;
    withdrawalRequest.processedBy = new Types.ObjectId(adminId);
    withdrawalRequest.processedAt = new Date();
    // transactionId is already set when request was created
    if (approveDto.adminNotes) {
      withdrawalRequest.adminNotes = approveDto.adminNotes;
    }
    await withdrawalRequest.save();

    this.logger.log(`Approved withdrawal request ${requestId} by admin ${adminId}`);

    return {
      success: true,
      message: 'Withdrawal request approved successfully',
      data: {
        withdrawalRequest,
        transaction: {
          _id: transaction._id,
          transactionRef: transaction.transactionRef,
          amount: transaction.amount,
        },
      },
    };
  }

  async rejectWithdrawalRequest(requestId: string, adminId: string, rejectDto: RejectWithdrawalDto): Promise<any> {
    const withdrawalRequest = await this.withdrawalRequestModel.findById(requestId);

    if (!withdrawalRequest) {
      throw new NotFoundException('Withdrawal request not found');
    }

    if (withdrawalRequest.status !== WithdrawalRequestStatus.PENDING) {
      throw new BadRequestException(`Cannot reject withdrawal request with status: ${withdrawalRequest.status}`);
    }

    // Get the existing pending transaction and update it to FAILED
    if (withdrawalRequest.transactionId) {
      const transaction = await this.transactionModel.findById(withdrawalRequest.transactionId);
      if (transaction && transaction.status === TransactionStatus.PENDING) {
        transaction.status = TransactionStatus.FAILED;
        transaction.description = `Withdrawal rejected - ${rejectDto.rejectionReason || 'No reason provided'}`;
        await transaction.save();
      }
    }

    withdrawalRequest.status = WithdrawalRequestStatus.REJECTED;
    withdrawalRequest.processedBy = new Types.ObjectId(adminId);
    withdrawalRequest.processedAt = new Date();
    withdrawalRequest.rejectionReason = rejectDto.rejectionReason;
    if (rejectDto.adminNotes) {
      withdrawalRequest.adminNotes = rejectDto.adminNotes;
    }

    await withdrawalRequest.save();

    this.logger.log(`Rejected withdrawal request ${requestId} by admin ${adminId}`);

    return {
      success: true,
      message: 'Withdrawal request rejected successfully',
      data: withdrawalRequest,
    };
  }

  async getWithdrawalRequests(query: any): Promise<any> {
    const { page = 1, limit = 10, status, userId } = query;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (status) {
      filter.status = status;
    }
    if (userId) {
      filter.user = new Types.ObjectId(userId);
    }

    const total = await this.withdrawalRequestModel.countDocuments(filter);

    const requests = await this.withdrawalRequestModel
      .find(filter)
      .populate('user', 'fullName email phone')
      .populate('wallet')
      .populate('bankAccount')
      .populate('processedBy', 'fullName email')
      .populate('transactionId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    return {
      requests,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private generateTransactionRef(type: TransactionType, category: TransactionCategory): string {
    const prefix = type === TransactionType.CREDIT ? 'CR' : 'DB';
    const categoryCode = category.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = generateRandomString(4).toUpperCase();
    return `${prefix}${categoryCode}${timestamp}${random}`;
  }
}
