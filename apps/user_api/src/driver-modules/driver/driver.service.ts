import { BadRequestException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import {
  BalanceType,
  DriverLocation,
  DriverOnlineStatus,
  FirebaseNotificationService,
  generateRandomString,
  PaymentMethod,
  PaymentStatus,
  RatingRepository,
  RideRepository,
  RideStatus,
  SubscriptionPlanRepository,
  SubscriptionRepository,
  SubscriptionStatus,
  TransactionCategory,
  TransactionStatus,
  TransactionType,
  UpdateDriverProfileDto,
  updateFCMDto,
  AcceptConsentDto,
  ChangePasswordDto,
  User,
  UserRepository,
  UserRolesEnum,
  VehicleRepository,
  WalletRepository,
  WalletTransaction,
  Settings,
  SettingsDocument,
} from '@urcab-workspace/shared';
import { Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Vehicle, DocumentStatus, Ride } from '@urcab-workspace/shared';
import { DocumentVerificationStatusService } from './documentVerification.service';
import {
  CreateSubscriptionTransactionDto,
  SubscriptionPlansListResponseDto,
  GetSubscriptionTransactionsDto,
  SubscriptionTransactionsListResponseDto,
  SubscriptionTransactionResponseDto,
  GetEarningsDto,
  EarningsResponseDto,
  EarningsHistogramDataDto,
  EarningsStatsDto,
  EarningsPeriod,
} from './dto';
import { ConfigService } from '@nestjs/config';
import * as md5 from 'md5';
import * as bcrypt from 'bcryptjs';
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
    @InjectModel(Ride.name) private readonly rideModel: Model<Ride>,
    @InjectModel(Settings.name) private readonly settingsModel: Model<SettingsDocument>,
    private readonly subscriptionPlanRepository: SubscriptionPlanRepository,
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly walletRepository: WalletRepository,
    private readonly rideRepository: RideRepository,
    private readonly vehicleRepository: VehicleRepository,
    private readonly ratingRepository: RatingRepository,
    private readonly firebaseNotificationService: FirebaseNotificationService,
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
    // const hashString = `${amount}${skey}${domain}${tranID}${status}`;
    const calculatedHash = md5(amount + secretKey + domain + tranID + status);
    // console.log(calculatedHash, 'calculatedHash', skey, 'skey');
    // // Verify the hash matches the skey from the response
    // if (calculatedHash !== skey) {
    //   throw new BadRequestException('Invalid payment signature');
    // }

    const transaction = await this.transactionModel.findOne({ _id: new Types.ObjectId(orderid) });
    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${orderid} not found`);
    }

    if (transaction.category === TransactionCategory.RIDE) {
      const ride = await this.rideRepository.findById2(transaction.metadata.rideId);
      if (!ride) {
        throw new NotFoundException(`Ride with ID ${transaction.metadata.rideId} not found`);
      }

      // Update ride payment status to completed
      const updateData: any = {
        paymentStatus: PaymentStatus.COMPLETED,
        paymentConfirmedAt: new Date(),
      };

      // Update payment status (especially important if ride status is RIDE_REACHED_DESTINATION)
      await this.rideRepository.findByIdAndUpdate(transaction.metadata.rideId, updateData);

      // Get driver wallet and update balances
      const driverWallet = await this.walletRepository.findById(transaction.wallet.toString());
      if (!driverWallet) {
        throw new NotFoundException('Driver wallet not found');
      }

      if (transaction.paymentMethod !== PaymentMethod.CASH) {
        const newWithdrawableBalance = driverWallet.withdrawableBalance + transaction.amount;
        const newTotalBalance = driverWallet.totalBalance + transaction.amount;

        await this.walletRepository.findOneAndUpdate(
          { _id: new Types.ObjectId(transaction.wallet.toString()) },
          {
            withdrawableBalance: newWithdrawableBalance,
            totalBalance: newTotalBalance,
            lastTransactionDate: new Date(),
          },
        );

        // Update transaction with final balances
        transaction.withdrawableBalanceBefore = driverWallet.withdrawableBalance;
        transaction.withdrawableBalanceAfter = newWithdrawableBalance;
        transaction.totalBalanceBefore = driverWallet.totalBalance;
        transaction.totalBalanceAfter = newTotalBalance;
      }
      // Update wallet balances for card payment
      transaction.status = TransactionStatus.COMPLETED;
      transaction.completedAt = new Date();
      transaction.description = `Ride payment completed - ${transaction.paymentMethod} (RM${transaction.amount})`;

      await transaction.save();

      // Get passenger and driver details for notifications
      const passenger = await this.userRepository.findById(ride.passengerId?._id.toString());
      const driver = await this.userRepository.findById(ride.driverId?._id.toString());
      const vehicle = await this.vehicleRepository.findOne({
        driverId: ride.driverId?._id.toString(),
        isPrimary: true,
      });
      const rating = await this.ratingRepository.getAverageRating(ride.driverId?.toString());

      const updatedRide = await this.rideRepository.findById2(transaction.metadata.rideId);

      // Send payment completed notification to passenger
      if (passenger?.fcmToken) {
        await this.firebaseNotificationService.sendRideStatusUpdate(
          passenger.fcmToken,
          // 'PAYMENT_COMPLETED',
          RideStatus.RIDE_REACHED_DESTINATION,
          transaction.metadata.rideId,
          { ...driver, vehicle, rating },
          updatedRide,
        );
      }

      // Send payment completed notification to driver
      if (driver?.fcmToken) {
        await this.firebaseNotificationService.sendRideStatusUpdate(
          driver.fcmToken,
          // 'PAYMENT_COMPLETED',
          RideStatus.RIDE_REACHED_DESTINATION,
          transaction.metadata.rideId,
          { ...driver, vehicle, rating },
          updatedRide,
        );
      }

      this.logger.log(
        `Ride ${transaction.metadata.rideId} payment completed. Amount: RM${transaction.amount}. Driver wallet updated.`,
      );
    } else if (transaction.category === TransactionCategory.SUBSCRIPTION) {
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
      await this.subscriptionRepository.createSubscription({
        _id: new Types.ObjectId(),
        driverId: new Types.ObjectId(transaction.user.toString()),
        planId: new Types.ObjectId(transaction.subscriptionPlanId),
        type: plan.type,
        status: SubscriptionStatus.ACTIVE,
        startDate,
        endDate,
        price: finalPrice, // Capture current price from plan
        paymentReference: tranID,
        paymentDate: new Date(),
        approvedByAdminId: null,
        approvedAt: new Date(),
        autoRenew: false,
        discountPercentage: 0,
        discountReason: '',
        ridesCompleted: 0,
        totalEarnings: 0,
      });

      const newWithdrawableBalance = dWallet.withdrawableBalance + transaction.amount;
      const newTotalBalance = dWallet.totalBalance + transaction.amount;

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

      // Update transaction with final balances
      transaction.withdrawableBalanceBefore = dWallet.withdrawableBalance;
      transaction.withdrawableBalanceAfter = newWithdrawableBalance;
      transaction.totalBalanceBefore = dWallet.totalBalance;
      transaction.totalBalanceAfter = newTotalBalance;
    } else if (transaction.category === TransactionCategory.DEPOSIT) {
      const dWallet = await this.walletRepository.findById(transaction.wallet.toString());

      const newWithdrawableBalance = dWallet.withdrawableBalance + transaction.amount;
      const newTotalBalance = dWallet.totalBalance + transaction.amount;

      await this.walletRepository.findOneAndUpdate(
        { _id: new Types.ObjectId(transaction.wallet.toString()) },
        {
          withdrawableBalance: newWithdrawableBalance,
          totalBalance: newTotalBalance,
          lastTransactionDate: new Date(),
        },
      );

      // Update transaction with final balances
      transaction.withdrawableBalanceBefore = dWallet.withdrawableBalance;
      transaction.withdrawableBalanceAfter = newWithdrawableBalance;
      transaction.totalBalanceBefore = dWallet.totalBalance;
      transaction.totalBalanceAfter = newTotalBalance;
      transaction.description = `Deposit completed - ${transaction.paymentMethod} (RM${transaction.amount})`;
    } else if (transaction.category === TransactionCategory.EVP_PAYMENT) {
      // Handle EVP payment completion
      const vehicleId = transaction.metadata?.vehicleId;
      if (!vehicleId) {
        throw new BadRequestException('Vehicle ID not found in transaction metadata');
      }

      const vehicle = await this.vehicleRepository.findById(vehicleId);
      if (!vehicle) {
        throw new NotFoundException(`Vehicle with ID ${vehicleId} not found`);
      }

      // Update wallet balances (deduct from driver's wallet)
      const dWallet = await this.walletRepository.findById(transaction.wallet.toString());

      // Update transaction with final balances
      transaction.withdrawableBalanceBefore = dWallet.withdrawableBalance;
      transaction.withdrawableBalanceAfter = dWallet.withdrawableBalance;
      transaction.totalBalanceBefore = dWallet.totalBalance;
      transaction.totalBalanceAfter = dWallet.totalBalance;
      transaction.description = `EVP payment completed - ${transaction.paymentMethod} (RM${transaction.amount})`;

      // Payment is completed - evpPaymentPending defaults to false, so no need to update it
      // Admin can check for completed EVP_PAYMENT transactions to generate EVP

      // Set evpAdminGeneratedPending to true since payment is now completed
      await this.vehicleRepository.findOneAndUpdate(
        { _id: new Types.ObjectId(vehicleId) },
        { evpAdminGeneratedPending: true },
      );

      this.logger.log(
        `EVP payment completed for vehicle ${vehicleId}. Amount: RM${transaction.amount}. Admin can now generate EVP.`,
      );
    }

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
          'fullName email phone photo type gender dob isPhoneConfirmed isEmailConfirmed isActive isPhotoUpload isProfileUpdated acceptConsent',
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

      // Get active (paid) subscription plan
      const activeSubscription = await this.subscriptionRepository.findActiveSubscription(_id);

      let activePlan = null;
      if (activeSubscription) {
        // Get plan details for active paid subscription
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
      // Get all active subscription plans
      const plans = await this.subscriptionPlanRepository.findActivePlans();

      // Get driver's active subscription
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
        // Handle paid plans only
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

      // If going online, check if driver has an active ride
      if (isOnline) {
        const activeRide = await this.rideRepository.findActiveRideByDriver(new Types.ObjectId(driverId));
        if (activeRide) {
          this.logger.warn(
            `Driver ${driverId} attempted to go online but has an active ride ${activeRide._id} with status: ${activeRide.status}`,
          );
          throw new BadRequestException(
            `You have an active ride (${activeRide.status.toLowerCase().replace('_', ' ')}). ` +
              `Please complete or cancel your current ride before going online. ` +
              `Ride ID: ${activeRide._id}`,
          );
        }
      }

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

  async getDriverEarnings(driverId: string, queryDto: GetEarningsDto): Promise<EarningsResponseDto> {
    try {
      const period = queryDto.period || EarningsPeriod.DAY;
      const driverObjectId = new Types.ObjectId(driverId);

      // Get date range based on period
      const now = new Date();
      let startDate: Date;
      let endDate: Date = now;
      let groupByFormat: string;
      let useWeekGrouping: boolean = false;

      switch (period) {
        case EarningsPeriod.DAY:
          // Last 7 days
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 7);
          startDate.setHours(0, 0, 0, 0);
          groupByFormat = '%Y-%m-%d';
          break;
        case EarningsPeriod.WEEK:
          // Last 7 weeks
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 49);
          useWeekGrouping = true;
          break;
        case EarningsPeriod.MONTH:
          // Last 12 months
          startDate = new Date(now);
          startDate.setMonth(startDate.getMonth() - 12);
          startDate.setHours(0, 0, 0, 0);
          groupByFormat = '%Y-%m';
          break;
      }

      // Get histogram data - aggregate earnings by period
      let histogramData: EarningsHistogramDataDto[] = [];
      let dataMap: Map<string, { earnings: number; rides: number }> = new Map();

      if (useWeekGrouping) {
        // For weekly grouping, we need to group by week
        const weekGroups = await this.transactionModel.aggregate([
          {
            $match: {
              user: driverObjectId,
              category: TransactionCategory.RIDE,
              type: TransactionType.CREDIT,
              status: TransactionStatus.COMPLETED,
              createdAt: { $gte: startDate, $lte: endDate },
            },
          },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                week: { $week: '$createdAt' },
              },
              earnings: { $sum: '$amount' },
              rides: { $sum: 1 },
            },
          },
        ]);

        // Create map from aggregated data
        weekGroups.forEach((group) => {
          const key = `${group._id.year}-${group._id.week}`;
          dataMap.set(key, {
            earnings: group.earnings || 0,
            rides: group.rides || 0,
          });
        });

        // Generate all weeks in the range and fill with zeros if missing
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          const year = currentDate.getFullYear();
          const week = this.getWeekNumber(currentDate);
          const key = `${year}-${week}`;
          const label = `Week ${week}, ${year}`;

          if (!dataMap.has(key)) {
            dataMap.set(key, { earnings: 0, rides: 0 });
          }

          histogramData.push({
            label,
            earnings: dataMap.get(key)!.earnings,
            rides: dataMap.get(key)!.rides,
          });

          // Move to next week
          currentDate.setDate(currentDate.getDate() + 7);
        }
      } else {
        // For daily or monthly grouping
        const dateGroups = await this.transactionModel.aggregate([
          {
            $match: {
              user: driverObjectId,
              category: TransactionCategory.RIDE,
              type: `${TransactionType.CREDIT}`,
              status: TransactionStatus.COMPLETED,
              createdAt: { $gte: startDate, $lte: endDate },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: groupByFormat,
                  date: '$createdAt',
                },
              },
              earnings: { $sum: '$amount' },
              rides: { $sum: 1 },
            },
          },
        ]);

        // Create map from aggregated data
        dateGroups.forEach((group) => {
          dataMap.set(group._id, {
            earnings: group.earnings || 0,
            rides: group.rides || 0,
          });
        });

        // Generate all periods in the range and fill with zeros if missing
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          let label: string;
          let key: string;

          if (period === EarningsPeriod.DAY) {
            // Daily format: YYYY-MM-DD
            key = currentDate.toISOString().split('T')[0];
            label = key;
            currentDate.setDate(currentDate.getDate() + 1);
          } else {
            // Monthly format: YYYY-MM
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            key = `${year}-${month}`;
            label = key;
            currentDate.setMonth(currentDate.getMonth() + 1);
          }

          if (!dataMap.has(key)) {
            dataMap.set(key, { earnings: 0, rides: 0 });
          }

          histogramData.push({
            label,
            earnings: dataMap.get(key)!.earnings,
            rides: dataMap.get(key)!.rides,
          });
        }
      }

      // Get stats - count rides by status
      const [completedRidesCount, cancelledRidesCount, pendingRidesCount, totalEarningsResult] = await Promise.all([
        // Completed rides count
        this.rideModel.countDocuments({
          driverId: driverObjectId,
          status: RideStatus.RIDE_COMPLETED,
          createdAt: { $gte: startDate, $lte: endDate },
        }),
        // Cancelled rides count
        this.rideModel.countDocuments({
          driverId: driverObjectId,
          status: RideStatus.RIDE_CANCELLED,
          createdAt: { $gte: startDate, $lte: endDate },
        }),
        // Pending rides count (rides that are not completed or cancelled)
        this.rideModel.countDocuments({
          driverId: driverObjectId,
          status: {
            $nin: [RideStatus.RIDE_COMPLETED, RideStatus.RIDE_CANCELLED],
          },
          createdAt: { $gte: startDate, $lte: endDate },
        }),
        // Total earnings from completed transactions
        this.transactionModel.aggregate([
          {
            $match: {
              user: driverObjectId,
              category: TransactionCategory.RIDE,
              type: `${TransactionType.CREDIT}`,
              status: TransactionStatus.COMPLETED,
              createdAt: { $gte: startDate, $lte: endDate },
            },
          },
          {
            $group: {
              _id: null,
              totalEarnings: { $sum: '$amount' },
            },
          },
        ]),
      ]);

      const totalEarnings = totalEarningsResult.length > 0 ? totalEarningsResult[0].totalEarnings : 0;

      const stats: EarningsStatsDto = {
        completedRides: completedRidesCount,
        cancelledRides: cancelledRidesCount,
        pendingRides: pendingRidesCount,
        totalEarnings: totalEarnings || 0,
      };

      return {
        histogram: histogramData,
        stats,
      };
    } catch (error) {
      this.logger.error(`Failed to get driver earnings for driver ${driverId}:`, error);
      throw new BadRequestException(error.message || 'Failed to get driver earnings');
    }
  }

  /**
   * Accept consent for driver
   */
  async acceptConsent(
    userId: string,
    acceptConsentDto: AcceptConsentDto,
  ): Promise<{ success: boolean; message: string; data: any }> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new UnauthorizedException('User Does Not Exist');
      }

      // Update the acceptConsent field
      const updatedUser = await this.userRepository2
        .findOneAndUpdate({ _id: userId }, { $set: { acceptConsent: acceptConsentDto.acceptConsent } }, { new: true })
        .select('-fcmToken');

      if (!updatedUser) {
        throw new Error('Failed to update consent');
      }

      return {
        success: true,
        message: 'Consent updated successfully',
        data: {
          acceptConsent: updatedUser.acceptConsent,
        },
      };
    } catch (error) {
      throw new UnauthorizedException(error.message || 'Failed to update consent');
    }
  }

  /**
   * Get terms and conditions from settings for drivers
   */
  async getTermsAndConditions(): Promise<{ termsAndConditions: string; lastUpdated?: Date }> {
    try {
      const settings = await this.settingsModel.findOne().exec();

      if (!settings) {
        return {
          termsAndConditions: '',
        };
      }

      return {
        termsAndConditions: settings.driverTermsAndConditions || '',
        lastUpdated: settings.driverTermsAndConditionsLastUpdated,
      };
    } catch (error) {
      throw new NotFoundException('Failed to retrieve terms and conditions');
    }
  }

  /**
   * Change password for driver
   */
  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Get user with password fields
      const user = await this.userRepository.findOne({ _id: new Types.ObjectId(userId) }, [], {
        select: 'passwordSalt passwordHash email',
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Verify current password
      const currentPasswordHash = await bcrypt.hash(changePasswordDto.currentPassword, user.passwordSalt);
      if (currentPasswordHash !== user.passwordHash) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      // Check if new password is same as current password
      const newPasswordHash = await bcrypt.hash(changePasswordDto.newPassword, user.passwordSalt);
      if (newPasswordHash === user.passwordHash) {
        throw new BadRequestException('New password must be different from current password');
      }

      // Generate new salt and hash for new password
      const newPassSalt = await bcrypt.genSalt();
      const newPasswordHashWithNewSalt = await bcrypt.hash(changePasswordDto.newPassword, newPassSalt);

      // Update password
      await this.userRepository.findOneAndUpdate(
        { _id: new Types.ObjectId(userId) },
        {
          passwordHash: newPasswordHashWithNewSalt,
          passwordSalt: newPassSalt,
        },
      );

      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to change password for driver ${userId}:`, error);
      if (
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to change password');
    }
  }

  /**
   * Get ISO week number for a date
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }
}
