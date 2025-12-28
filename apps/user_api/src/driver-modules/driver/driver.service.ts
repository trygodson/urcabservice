import { BadRequestException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import {
  BalanceType,
  DriverLocation,
  DriverOnlineStatus,
  generateRandomString,
  SubscriptionPlanRepository,
  SubscriptionRepository,
  SubscriptionStatus,
  TransactionCategory,
  TransactionStatus,
  TransactionType,
  UpdateDriverProfileDto,
  updateFCMDto,
  User,
  UserRepository,
  UserRolesEnum,
  WalletRepository,
  WalletTransaction,
} from '@urcab-workspace/shared';
import { Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Vehicle, DocumentStatus } from '@urcab-workspace/shared';
import { DocumentVerificationStatusService } from './documentVerification.service';
import {
  CreateSubscriptionTransactionDto,
  SubscriptionPlansListResponseDto,
  GetSubscriptionTransactionsDto,
  SubscriptionTransactionsListResponseDto,
  SubscriptionTransactionResponseDto,
} from './dto';
import { ConfigService } from '@nestjs/config';
import * as md5 from 'md5';
interface CreateTransactionData {
  userId: string;
  walletId: string;
  type: TransactionType;
  category: TransactionCategory;
  balanceType: BalanceType;
  amount: number;
  // currency: string;
  // currencySymbol: string;
  depositBalanceBefore: number;
  depositBalanceAfter: number;
  withdrawableBalanceBefore: number;
  withdrawableBalanceAfter: number;
  totalBalanceBefore: number;
  totalBalanceAfter: number;
  description: string;
  reference?: string;
  metadata?: Record<string, any>;
  status: TransactionStatus;
  subscriptionPlanId?: string;
}
@Injectable()
export class DriverService {
  protected readonly logger = new Logger(DriverService.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
    private readonly documentVerificationService: DocumentVerificationStatusService,
    @InjectModel(Vehicle.name) private readonly vehicleModel: Model<Vehicle>,
    @InjectModel(User.name) private readonly userRepository2: Model<User>,
    @InjectModel(DriverLocation.name) private readonly driverLocation: Model<DriverLocation>,
    // @InjectModel(Driver.name) private readonly driverLocation: Model<DriverLocation>,
    @InjectModel(WalletTransaction.name) private readonly transactionModel: Model<WalletTransaction>,
    private readonly subscriptionPlanRepository: SubscriptionPlanRepository,
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly walletRepository: WalletRepository,
  ) {}
  private generateTransactionRef(type: TransactionType, category: TransactionCategory): string {
    const prefix = type === TransactionType.CREDIT ? 'CR' : 'DB';
    const categoryCode = category.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = generateRandomString(4).toUpperCase();

    return `${prefix}${categoryCode}${timestamp}${random}`;
  }
  private async createTransaction(data: CreateTransactionData): Promise<WalletTransaction> {
    // Generate unique transaction reference
    const transactionRef = this.generateTransactionRef(data.type, data.category);

    // Calculate platform fee if applicable
    let platformFee = 0;
    let netAmount = data.amount;

    // if (data.category === TransactionCategory.CONTEST_ENTRY && data.metadata?.commission) {
    //   platformFee = data.metadata.commission;
    //   netAmount = data.amount - platformFee;
    // }

    const transaction = new this.transactionModel({
      _id: new Types.ObjectId(),
      transactionRef,
      user: new Types.ObjectId(data.userId),
      wallet: new Types.ObjectId(data.walletId),
      type: data.type,
      status: data.status,
      category: data.category,
      balanceType: data.balanceType,
      amount: data.amount,
      subscriptionPlanId: data.subscriptionPlanId,
      // currency: data.currency,
      // currencySymbol: data.currencySymbol,
      depositBalanceBefore: data.depositBalanceBefore,
      depositBalanceAfter: data.depositBalanceAfter,
      withdrawableBalanceBefore: data.withdrawableBalanceBefore,
      withdrawableBalanceAfter: data.withdrawableBalanceAfter,
      totalBalanceBefore: data.totalBalanceBefore,
      totalBalanceAfter: data.totalBalanceAfter,
      description: data.description,
      reference: data.reference,
      metadata: data.metadata,
      platformFee,
      netAmount,
      completedAt: data.status === TransactionStatus.COMPLETED ? new Date() : undefined,
    });

    await transaction.save();

    this.logger.log(
      `Created ${data.type} transaction ${transactionRef} for ${'NGN'}${data.amount} on ${data.balanceType} balance`,
    );

    return transaction;
  }
  async createSubscriptionTransaction(driverId: string, createDto: CreateSubscriptionTransactionDto) {
    // Validate driver exists
    const user = await this.userRepository.findOne({ _id: new Types.ObjectId(driverId), type: UserRolesEnum.DRIVER });
    if (!user) {
      throw new NotFoundException(`Driver with ID ${driverId} not found`);
    }

    // Check if driver already has an active PAID subscription (free plan is allowed to upgrade)
    const now = new Date();
    const activePaidSubscription = await this.subscriptionRepository.findOne({
      driverId: new Types.ObjectId(driverId),
      status: 'active',
      type: { $ne: 'free' }, // Exclude free plan
      startDate: { $lte: now },
      endDate: { $gte: now },
    });

    if (activePaidSubscription) {
      throw new BadRequestException(
        'Driver already has an active paid subscription. Please wait for it to expire before creating a new one.',
      );
    }

    const subscriptionPlan = await this.subscriptionPlanRepository.findById(createDto.planId);
    if (!subscriptionPlan) {
      throw new NotFoundException(`Subscription plan with ID ${createDto.planId} not found`);
    }

    // Validate plan is active
    if (subscriptionPlan.status !== 'active' || !subscriptionPlan.isActive) {
      throw new BadRequestException('Subscription plan is not active');
    }

    const dWallet = await this.walletRepository.findAdminWallet();
    if (!dWallet) {
      throw new NotFoundException('Super admin wallet not found');
    }

    const dd = await this.createTransaction({
      amount: subscriptionPlan.price,
      // currency: dWallet.currency,
      // currencySymbol: dWallet.currencySymbol,
      depositBalanceBefore: dWallet.depositBalance,
      depositBalanceAfter: dWallet.depositBalance + subscriptionPlan.price,
      withdrawableBalanceBefore: dWallet.withdrawableBalance,
      withdrawableBalanceAfter: dWallet.withdrawableBalance,
      totalBalanceBefore: dWallet.totalBalance,
      totalBalanceAfter: dWallet.totalBalance + subscriptionPlan.price,
      description: `Subscription Payment for ${subscriptionPlan.name}`,
      type: TransactionType.CREDIT,
      subscriptionPlanId: subscriptionPlan._id.toString(),
      category: TransactionCategory.SUBSCRIPTION,
      balanceType: BalanceType.DEPOSIT,
      walletId: dWallet._id.toString(),
      userId: driverId,
      status: TransactionStatus.PENDING,
    });

    return {
      success: true,
      message: 'Transaction created successfully',
      data: dd,
    };
    // Validate plan exists and is active
  }

  async notificationUrl(paymentData: any) {
    // console.log(paymentData, '---data from notificationUrl=----');
    // let paymentData: any = {
    //   nbcb: '2',
    //   tranID: '122551',
    //   orderid: '694eb7a726b3964a3c8b33bb',
    //   status: '00',
    //   error_desc: '',
    //   error_code: '',
    //   domain: 'SB_urcab24x7',
    //   amount: '300.00',
    //   currency: 'RM',
    //   appcode: '050008',
    //   paydate: '2025-12-27 00:31:16',
    //   skey: '6ba41cb9d236a8a6f5ff094f6d39ff27',
    //   channel: 'credit',
    //   extraP: '{"ccbrand":"VISA","cctype":"CREDIT","cclast4":"0012"}',
    // };
    // Extract payment data
    const { amount, skey, domain, orderid, tranID, status } = paymentData;

    // Get secret key from environment (you'll need to add this to your .env)
    const secretKey = this.configService.get<string>('MP_SECRET_KEY');

    if (!secretKey) {
      throw new BadRequestException('Payment secret key not configured');
    }

    // Calculate MD5 hash: md5(Amount+secretKey+domain+tranID+status)
    const hashString = `${amount}${secretKey}${domain}${tranID}${status}`;
    const calculatedHash = md5(hashString);
    console.log(calculatedHash, 'calculatedHash', skey, 'skey');
    // Verify the hash matches the skey from the response
    // if (calculatedHash !== skey) {
    //   throw new BadRequestException('Invalid payment signature');
    // }

    const transaction = await this.transactionModel.findOne({ _id: new Types.ObjectId(orderid) });
    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${orderid} not found`);
    }
    const plan = await this.subscriptionPlanRepository.findById(transaction.subscriptionPlanId);
    if (!plan) {
      throw new NotFoundException(`Subscription plan with ID ${transaction.subscriptionPlanId} not found`);
    }

    if (plan.status !== 'active' || !plan.isActive) {
      throw new BadRequestException('Subscription plan is not active');
    }

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.validity);

    // Calculate final price with discount
    let finalPrice = plan.price;
    const dWallet = await this.walletRepository.findById(transaction.wallet.toString());

    // Create subscription with current price from plan (captured at creation time)
    const subscription = await this.subscriptionRepository.createSubscription({
      _id: new Types.ObjectId(),
      driverId: new Types.ObjectId(transaction.user.toString()),
      planId: new Types.ObjectId(transaction.subscriptionPlanId),
      type: plan.type,
      status: SubscriptionStatus.ACTIVE,
      startDate,
      endDate,
      price: finalPrice, // Capture current price from plan

      paymentReference: transaction.reference,
      paymentDate: new Date(),
      approvedByAdminId: null,
      approvedAt: new Date(),
      autoRenew: false,
      discountPercentage: 0,
      discountReason: '',

      ridesCompleted: 0,
      totalEarnings: 0,
    });
    // console.log(subscription, 'subscription', transaction);
    await this.walletRepository.findOneAndUpdate(
      { _id: new Types.ObjectId(transaction.wallet.toString()) },
      {
        depositBalance: transaction.depositBalanceAfter,
        totalBalance: transaction.totalBalanceAfter,
        totalDeposited: dWallet.totalDeposited + transaction.amount,
        lastTransactionDate: new Date(),
      },
    );

    transaction.status = TransactionStatus.COMPLETED;
    await transaction.save();

    return {
      success: true,
      message: 'Payment verified successfully',
      data: {
        tranID,
        orderid: paymentData.orderid,
        status,
        amount,
      },
    };
    // return;
  }

  async updateFCMToken(userId: string, updateDto: updateFCMDto) {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new UnauthorizedException('User Does Not Exist');
      }

      // Only update the allowed fields
      const updateData: Partial<typeof user> = {};

      updateData.fcmToken = updateDto.fcmToken;

      // Update the user profile
      await this.userRepository2
        .findOneAndUpdate({ _id: userId }, { $set: updateData }, { new: true, upsert: true })
        .select('-fcmToken');

      return {
        success: true,
        message: 'FCM updated successfully',
      };
    } catch (error) {
      throw new UnauthorizedException(error.message || 'Failed to update profile');
    }
  }

  async getUser({ _id }) {
    try {
      const user = await this.userRepository.findById(_id, [], {
        select:
          'fullName email phone photo type gender dob isPhoneConfirmed isEmailConfirmed isActive isPhotoUpload isProfileUpdated',
      });
      if (!user) {
        throw new UnauthorizedException('User Does Not Exist');
      }

      // Check document verification status
      const verificationStatus = await this.documentVerificationService.getDocumentVerificationStatus(
        new Types.ObjectId(_id),
      );

      // Check if driver has registered any vehicles
      const vehicles = await this.vehicleModel
        .find({
          driverId: new Types.ObjectId(_id),
          isActive: true,
        })
        .lean();
      const driverlocation = await this.driverLocation
        .findOne({
          driverId: new Types.ObjectId(_id),
          // isActive: true,
        })
        .lean();

      // Calculate verification progress
      const verificationProgress = this.calculateVerificationProgress(verificationStatus);

      // Check if profile is complete
      const isProfileComplete = verificationStatus.hasCompleteDocumentation;

      // Get active subscription plan
      await this.subscriptionRepository.getOrCreateFreeSubscription(_id);
      const activeSubscription = await this.subscriptionRepository.findActiveSubscription(_id);

      let activePlan = null;
      if (activeSubscription) {
        if (activeSubscription.type === 'free') {
          activePlan = {
            _id: activeSubscription._id.toString(),
            planId: null,
            planName: 'Free Plan',
            planType: 'free',
            startDate: activeSubscription.startDate,
            endDate: activeSubscription.endDate,
            expiryDate: activeSubscription.endDate,
            price: 0,
            status: activeSubscription.status,
            dailyRideRequests: activeSubscription.dailyRideRequests || 0,
            dailyLimit: 3,
            remainingRequests: Math.max(0, 3 - (activeSubscription.dailyRideRequests || 0)),
            isUnlimited: false,
          };
        } else {
          // Get plan details for paid subscription
          const plan = await this.subscriptionPlanRepository.findById(activeSubscription.planId?.toString() || '');
          activePlan = {
            _id: activeSubscription._id.toString(),
            planId: activeSubscription.planId?.toString() || '',
            planName: plan?.name || '',
            planType: activeSubscription.type,
            startDate: activeSubscription.startDate,
            endDate: activeSubscription.endDate,
            expiryDate: activeSubscription.endDate,
            price: activeSubscription.price,
            status: activeSubscription.status,
            isUnlimited: true,
          };
        }
      }

      delete user.fcmToken;
      return {
        success: true,
        data: {
          ...user,
          status: driverlocation?.status ?? null,
          activePlan,
          driverVerification: {
            isStarted: verificationStatus.uploadedCount > 0,
            isComplete: isProfileComplete,
            progress: verificationProgress,
            verifiedDocuments: verificationStatus.verifiedCount,
            pendingDocuments:
              verificationStatus.uploadedCount - verificationStatus.verifiedCount - verificationStatus.rejectedCount,
            rejectedDocuments: verificationStatus.rejectedCount,
            totalRequired: verificationStatus.requiredCount,
            hasVehicleRegistered: vehicles.length > 0,
            vehicleCount: vehicles.length,
            // primaryVehicle: vehicles.find((v) => v.isPrimary),
            overallStatus: verificationStatus.overallStatus,
            expiringSoonCount: verificationStatus.expiringSoonCount,
            canGoOnline: this.canDriverGoOnline(isProfileComplete, vehicles),
            blockingItems: await this.getBlockingItems(_id, isProfileComplete, vehicles),
          },
        },
      };
    } catch (error) {
      throw new UnauthorizedException(error.message || 'Failed to get user details');
    }
  }

  private calculateVerificationProgress(verificationStatus: any): number {
    if (verificationStatus.requiredCount === 0) return 0;

    const progress = (verificationStatus.verifiedCount / verificationStatus.requiredCount) * 100;
    return Math.round(progress);
  }

  private canDriverGoOnline(isProfileComplete: boolean, vehicles: Vehicle[]): boolean {
    return (
      isProfileComplete &&
      vehicles.length > 0 &&
      vehicles.some((v) => v.status === 'verified' && v.hasCompleteDocumentation)
    );
  }

  private async getBlockingItems(driverId: string, isProfileComplete: boolean, vehicles: Vehicle[]): Promise<string[]> {
    const blockingItems: string[] = [];

    // Check profile verification
    if (!isProfileComplete) {
      const { missingItems } = await this.documentVerificationService.isDriverFullyVerified(
        new Types.ObjectId(driverId),
      );
      blockingItems.push(...missingItems);
    }

    // Check vehicle requirements
    if (vehicles.length === 0) {
      blockingItems.push('No vehicle registered');
    } else {
      const hasVerifiedVehicle = vehicles.some((v) => v.status === 'VERIFIED' && v.hasCompleteDocumentation);

      if (!hasVerifiedVehicle) {
        blockingItems.push('No verified vehicle available');
      }

      // Check for primary vehicle
      if (!vehicles.some((v) => v.isPrimary)) {
        blockingItems.push('No primary vehicle selected');
      }
    }

    return blockingItems;
  }

  async updateProfile(userId: string, updateDto: UpdateDriverProfileDto) {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new UnauthorizedException('User Does Not Exist');
      }

      // Only update the allowed fields
      const updateData: Partial<typeof user> = {};

      if (updateDto.fullName) {
        updateData.fullName = updateDto.fullName;
      }

      if (updateDto.phone) {
        // Check if phone number is already in use by another user
        const existingUserWithPhone = await this.userRepository2.findOne({
          phone: updateDto.phone,
          _id: { $ne: userId },
        });

        if (existingUserWithPhone) {
          throw new Error('Phone number is already in use');
        }
        updateData.phone = updateDto.phone;
      }

      if (updateDto.photo) {
        updateData.photo = updateDto.photo;
        updateData.isPhotoUpload = true;
      }

      // Update the user profile
      const updatedUser = await this.userRepository2
        .findOneAndUpdate(
          { _id: new Types.ObjectId(userId) },
          { $set: updateData },
          {
            new: true,
            upsert: true,
            // select:
            //   'fullName email phone photo type gender dob isPhoneConfirmed isEmailConfirmed isActive isPhotoUpload isProfileUpdated -fcmToken',
          },
        )
        .select('-fcmToken');

      if (!updatedUser) {
        throw new Error('Failed to update profile');
      }

      return {
        success: true,
        message: 'Profile updated successfully',
        data: updatedUser,
      };
    } catch (error) {
      throw new UnauthorizedException(error.message || 'Failed to update profile');
    }
  }

  async getSubscriptionPlans(driverId: string): Promise<SubscriptionPlansListResponseDto> {
    try {
      // Ensure driver has a free subscription
      await this.subscriptionRepository.getOrCreateFreeSubscription(driverId);

      // Get all active subscription plans
      const plans = await this.subscriptionPlanRepository.findActivePlans();

      // Get driver's active subscription (including free plan)
      const activeSubscription = await this.subscriptionRepository.findActiveSubscription(driverId);

      // Map plans with driver's subscription status
      const plansWithStatus = plans.map((plan) => {
        const isDriverActive = activeSubscription && activeSubscription.planId?.toString() === plan._id.toString();

        return {
          _id: plan._id.toString(),
          name: plan.name,
          price: plan.price,
          description: plan.description,
          validity: plan.validity,
          type: plan.type,
          status: plan.status,
          isDriverActive,
          // activeSubscriptionId: isDriverActive ? activeSubscription._id.toString() : undefined,
          // expiryDate: isDriverActive ? activeSubscription.endDate : undefined,
          // startDate: isDriverActive ? activeSubscription.startDate : undefined,
          // createdAt: (plan as any).createdAt || new Date(),
          // updatedAt: (plan as any).updatedAt || new Date(),
        };
      });

      // Format active subscription info if exists
      let activeSubscriptionInfo = undefined;
      if (activeSubscription) {
        // Handle free plan
        if (activeSubscription.type === 'free') {
          activeSubscriptionInfo = {
            _id: activeSubscription._id.toString(),
            planId: null,
            planName: 'Free Plan',
            startDate: activeSubscription.startDate,
            endDate: activeSubscription.endDate,
            expiryDate: activeSubscription.endDate,
            price: 0,
            status: activeSubscription.status,
            dailyRideRequests: activeSubscription.dailyRideRequests || 0,
            dailyLimit: 3,
            remainingRequests: Math.max(0, 3 - (activeSubscription.dailyRideRequests || 0)),
          };
        } else {
          // Handle paid plans
          const plan = plans.find((p) => p._id.toString() === activeSubscription.planId?.toString());
          activeSubscriptionInfo = {
            _id: activeSubscription._id.toString(),
            planId: activeSubscription.planId?.toString() || '',
            planName: plan?.name || '',
            startDate: activeSubscription.startDate,
            endDate: activeSubscription.endDate,
            expiryDate: activeSubscription.endDate,
            price: activeSubscription.price,
            status: activeSubscription.status,
          };
        }
      }

      return {
        plans: plansWithStatus,
        activeSubscription: activeSubscriptionInfo,
      };
    } catch (error) {
      this.logger.error(`Error fetching subscription plans for driver ${driverId}:`, error);
      throw new BadRequestException('Failed to fetch subscription plans');
    }
  }

  async updateDriverStatus(driverId: string, status: DriverOnlineStatus) {
    try {
      const driver = await this.userRepository.findOne({
        _id: new Types.ObjectId(driverId),
        type: UserRolesEnum.DRIVER,
      });
      if (!driver) {
        throw new NotFoundException(`Driver with ID ${driverId} not found`);
      }

      const isOnline = status === DriverOnlineStatus.ONLINE;
      const updateData: any = {
        status,
        isAvailableForRides: isOnline,
        lastStatusChange: new Date(),
      };

      // If going offline, clear current ride if exists
      if (!isOnline) {
        updateData.currentRideId = null;
      }

      const updatedLocation = await this.driverLocation.findOneAndUpdate(
        { driverId: new Types.ObjectId(driverId) },
        { $set: updateData },
        { new: true, upsert: true },
      );

      if (!updatedLocation) {
        throw new NotFoundException('Driver location not found');
      }

      return {
        success: true,
        message: `Driver status updated to ${status}`,
        data: {
          driverId: driverId,
          status: updatedLocation.status,
          isAvailableForRides: updatedLocation.isAvailableForRides,
          lastStatusChange: updatedLocation.lastStatusChange,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to update driver status for driver ${driverId}:`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Failed to update driver status');
    }
  }

  async getSubscriptionTransactionHistory(
    driverId: string,
    queryDto: GetSubscriptionTransactionsDto,
  ): Promise<SubscriptionTransactionsListResponseDto> {
    try {
      const driver = await this.userRepository.findOne({
        _id: new Types.ObjectId(driverId),
        type: UserRolesEnum.DRIVER,
      });
      if (!driver) {
        throw new NotFoundException(`Driver with ID ${driverId} not found`);
      }

      const page = queryDto.page || 1;
      const limit = queryDto.limit || 10;
      const skip = (page - 1) * limit;

      // Build filter for subscription transactions
      const filter: any = {
        user: new Types.ObjectId(driverId),
        category: TransactionCategory.SUBSCRIPTION,
      };

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

      // Get subscription plan details for each transaction
      const transactionsWithPlans = await Promise.all(
        transactions.map(async (transaction) => {
          let planName: string | undefined;
          if (transaction.subscriptionPlanId) {
            const plan = await this.subscriptionPlanRepository.findById(transaction.subscriptionPlanId.toString());
            planName = plan?.name;
          }

          return {
            _id: transaction._id.toString(),
            transactionRef: transaction.transactionRef,
            amount: transaction.amount,
            status: String(transaction.status),
            type: String(transaction.type),
            category: String(transaction.category),
            description: transaction.description,
            reference: transaction.reference,
            subscriptionPlanId: transaction.subscriptionPlanId?.toString(),
            planName,
            createdAt: transaction.createdAt,
            completedAt: transaction.completedAt,
          };
        }),
      );

      return {
        transactions: transactionsWithPlans,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get subscription transaction history for driver ${driverId}:`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Failed to get subscription transaction history');
    }
  }
}
