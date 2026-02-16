import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { VehicleRepository } from './repository/vehicle.repository';
import {
  User,
  UserRepository,
  Vehicle,
  VehicleTypeRepository,
  WalletRepository,
  WalletTransaction,
  BalanceType,
  TransactionCategory,
  TransactionStatus,
  TransactionType,
  PaymentMethod,
  generateRandomString,
  Wallet,
  DriverEvpRepository,
  DriverEvp,
  Settings,
  VehicleStatus,
} from '@urcab-workspace/shared';
import { CreateVehicleDto, UpdateVehicleDto, VehicleResponseDto, PayEvpDto } from './dto';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class VehicleService {
  private readonly logger = new Logger(VehicleService.name);

  constructor(
    private readonly vehicleRepository: VehicleRepository,
    private readonly vehicleTypeRepository: VehicleTypeRepository,
    private readonly walletRepository: WalletRepository,
    private readonly driverEvpRepository: DriverEvpRepository,
    @InjectModel(User.name) private readonly userRepository: Model<User>,
    @InjectModel(WalletTransaction.name) private readonly transactionModel: Model<WalletTransaction>,
    @InjectModel(Wallet.name) private readonly walletModel: Model<Wallet>,
    @InjectModel(Settings.name) private readonly settingsModel: Model<Settings>,
  ) {}

  async createVehicle(driverId: Types.ObjectId, createVehicleDto: CreateVehicleDto): Promise<VehicleResponseDto> {
    try {
      // Check if driver is verified before allowing vehicle upload
      await this.checkDriverVerificationStatus(driverId);

      // Check for duplicate license plate
      const licensePlateExists = await this.vehicleRepository.checkLicensePlateExists(createVehicleDto.licensePlate);
      if (licensePlateExists) {
        throw new ConflictException('A vehicle with this license plate already exists');
      }

      // Check for duplicate VIN
      const vinExists = await this.vehicleRepository.checkVinExists(createVehicleDto.vin);
      if (vinExists) {
        throw new ConflictException('A vehicle with this VIN already exists');
      }

      // If no vehicles exist for this driver, make this the primary vehicle
      const existingVehicles = await this.vehicleRepository.getDriverVehicles(driverId);
      if (existingVehicles.length === 0) {
        createVehicleDto.isPrimary = true;
      }

      const savedVehicle = await this.vehicleRepository.createVehicle(driverId, {
        ...createVehicleDto,
        vehicleTypeId: createVehicleDto.vehicleTypeId ? new Types.ObjectId(createVehicleDto.vehicleTypeId) : undefined,
      });

      return await this.mapToResponseDto(savedVehicle);
    } catch (error) {
      this.logger.error(`Failed to create vehicle for driver ${driverId}`, error.stack);

      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to create vehicle');
    }
  }

  async updateVehicle(
    vehicleId: string,
    driverId: Types.ObjectId,
    updateVehicleDto: UpdateVehicleDto,
  ): Promise<VehicleResponseDto> {
    try {
      const vehicleObjectId = new Types.ObjectId(vehicleId);

      // Verify vehicle exists and belongs to driver
      const existingVehicle = await this.vehicleRepository.getVehicleById(vehicleObjectId);

      if (!existingVehicle) {
        throw new NotFoundException('Vehicle not found');
      }

      if (existingVehicle.driverId.toString() !== driverId.toString()) {
        throw new BadRequestException('Vehicle does not belong to this driver');
      }

      // Check for duplicate license plate (excluding current vehicle)
      if (updateVehicleDto.licensePlate) {
        const licensePlateExists = await this.vehicleRepository.checkLicensePlateExists(
          updateVehicleDto.licensePlate,
          vehicleObjectId,
        );
        if (licensePlateExists) {
          throw new ConflictException('A vehicle with this license plate already exists');
        }
      }

      // Check for duplicate VIN (excluding current vehicle)
      if (updateVehicleDto.vin) {
        const vinExists = await this.vehicleRepository.checkVinExists(updateVehicleDto.vin, vehicleObjectId);
        if (vinExists) {
          throw new ConflictException('A vehicle with this VIN already exists');
        }
      }

      if (updateVehicleDto.vehicleTypeId) {
        const vehicleType = await this.vehicleTypeRepository.getVehicleTypeById(
          new Types.ObjectId(updateVehicleDto.vehicleTypeId),
        );
        if (!vehicleType) {
          throw new NotFoundException('Vehicle type not found');
        }
      }

      const updatedVehicle = await this.vehicleRepository.updateVehicle(vehicleObjectId, {
        ...updateVehicleDto,
        vehicleTypeId: updateVehicleDto.vehicleTypeId ? new Types.ObjectId(updateVehicleDto.vehicleTypeId) : undefined,
      });

      if (!updatedVehicle) {
        throw new NotFoundException('Vehicle not found');
      }

      return await this.mapToResponseDto(updatedVehicle);
    } catch (error) {
      this.logger.error(`Failed to update vehicle ${vehicleId}`, error.stack);

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to update vehicle');
    }
  }

  async getDriverVehicles(driverId: Types.ObjectId, includeInactive: boolean = false): Promise<VehicleResponseDto[]> {
    try {
      const vehicles = await this.vehicleRepository.getDriverVehicles(driverId, includeInactive);

      // console.log(vehicles, '=====vehicles===');
      // return [];
      return await Promise.all(vehicles.map((vehicle) => this.mapToResponseDto(vehicle)));
    } catch (error) {
      this.logger.error(`Failed to get vehicles for driver ${driverId}`, error.stack);
      throw new BadRequestException('Failed to get driver vehicles');
    }
  }

  async getVehicleById(vehicleId: string, driverId: Types.ObjectId): Promise<any> {
    try {
      const vehicleObjectId = new Types.ObjectId(vehicleId);
      const vehicle = await this.vehicleRepository.getVehicleById(vehicleObjectId);

      if (!vehicle) {
        throw new NotFoundException('Vehicle not found');
      }

      if (vehicle.driverId.toString() !== driverId.toString()) {
        throw new BadRequestException('Vehicle does not belong to this driver');
      }

      return { success: true, data: await this.mapToVehicleDetailsResponseDto(vehicle) };
    } catch (error) {
      this.logger.error(`Failed to get vehicle ${vehicleId}`, error.stack);

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Failed to get vehicle');
    }
  }

  async getPrimaryVehicle(driverId: Types.ObjectId): Promise<VehicleResponseDto | null> {
    try {
      const vehicle = await this.vehicleRepository.getDriverPrimaryVehicle(driverId);
      return vehicle ? await this.mapToResponseDto(vehicle) : null;
    } catch (error) {
      this.logger.error(`Failed to get primary vehicle for driver ${driverId}`, error.stack);
      throw new BadRequestException('Failed to get primary vehicle');
    }
  }

  async getVehicleTypes(query: any = {}) {
    const filter = {};
    if (query.search) {
      filter['name'] = { $regex: query.search, $options: 'i' };
    }

    if (query.isActive !== undefined) {
      filter['isActive'] = query.isActive === 'true';
    }

    const vehicleTypes = await this.vehicleTypeRepository.model.find(filter);

    return {
      success: true,
      data: vehicleTypes,
    };
  }

  async setPrimaryVehicle(vehicleId: string, driverId: Types.ObjectId): Promise<VehicleResponseDto> {
    try {
      const vehicleObjectId = new Types.ObjectId(vehicleId);

      // Verify vehicle exists and belongs to driver
      const vehicle = await this.vehicleRepository.getVehicleById(vehicleObjectId);

      if (!vehicle) {
        throw new NotFoundException('Vehicle not found');
      }

      if (vehicle.driverId.toString() !== driverId.toString()) {
        throw new BadRequestException('Vehicle does not belong to this driver');
      }

      // Check if all vehicle documents have been uploaded and verified
      if (!vehicle.hasCompleteDocumentation) {
        throw new BadRequestException(
          'Cannot set vehicle as primary. All required vehicle documents must be uploaded and verified.',
        );
      }

      // Update vehicle to primary (repository will automatically unset other primary vehicles for this driver)
      const updatedVehicle = await this.vehicleRepository.updateVehicle(vehicleObjectId, {
        isPrimary: true,
      });

      if (!updatedVehicle) {
        throw new NotFoundException('Vehicle not found');
      }

      return await this.mapToResponseDto(updatedVehicle);
    } catch (error) {
      this.logger.error(`Failed to set primary vehicle ${vehicleId}`, error.stack);

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Failed to set primary vehicle');
    }
  }

  async deleteVehicle(vehicleId: string, driverId: Types.ObjectId): Promise<void> {
    try {
      const vehicleObjectId = new Types.ObjectId(vehicleId);

      // Verify vehicle exists and belongs to driver
      const vehicle = await this.vehicleRepository.getVehicleById(vehicleObjectId);
      // console.log(vehicle, '=====vehicle===');
      if (!vehicle) {
        throw new NotFoundException('Vehicle not found');
      }

      if (vehicle.driverId.toString() !== driverId.toString()) {
        throw new BadRequestException('Vehicle does not belong to this driver');
      }

      await this.vehicleRepository.updateVehicle(vehicleObjectId, {
        isActive: false,
      });
    } catch (error) {
      console.log(error, '======error===');
      this.logger.error(`Failed to delete vehicle ${vehicleId}`, error.stack);

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Failed to delete vehicle');
    }
  }

  private async checkDriverVerificationStatus(driverId: Types.ObjectId): Promise<void> {
    try {
      const driver = await this.userRepository.findOne({ _id: driverId }).exec();
      if (!driver) {
        throw new NotFoundException('Driver not found');
      }

      if (!driver.isDriverVerified) {
        throw new ForbiddenException(
          'Driver must be verified before uploading vehicle information. Please complete your document verification first.',
        );
      }

      if (!driver.hasCompleteDocumentation) {
        throw new ForbiddenException(
          'Driver must have complete and verified documentation before uploading vehicle information.',
        );
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Failed to check driver verification status for ${driverId}`, error.stack);
      throw new BadRequestException('Failed to verify driver status');
    }
  }

  private async mapToResponseDto(vehicle: Vehicle): Promise<VehicleResponseDto> {
    // Get active EVP for this vehicle
    let evp = null;
    try {
      const vehicleId = typeof vehicle._id === 'string' ? new Types.ObjectId(vehicle._id) : vehicle._id;
      const activeEvp = await this.driverEvpRepository.findOne({
        vehicleId: vehicleId,
        isActive: true,
        endDate: { $gt: new Date() },
        revokedAt: { $exists: false },
      });
      if (activeEvp) {
        evp = {
          _id: activeEvp._id.toString(),
          certificateNumber: activeEvp.certificateNumber,
          startDate: activeEvp.startDate,
          endDate: activeEvp.endDate,
          documentUrl: activeEvp.documentUrl,
          isActive: activeEvp.isActive,
          notes: activeEvp.notes,
        };
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch EVP for vehicle ${vehicle._id}:`, error);
    }

    return {
      _id: vehicle._id.toString(),
      driverId: vehicle.driverId.toString(),
      name: vehicle.name,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      licensePlate: vehicle.licensePlate,
      vin: vehicle.vin,
      status: vehicle.status,
      seatingCapacity: vehicle.seatingCapacity,
      vehicleType: vehicle.vehicleTypeId,
      backPhoto: vehicle.backPhoto,
      frontPhoto: vehicle.frontPhoto,
      leftPhoto: vehicle.leftPhoto,
      rightPhoto: vehicle.rightPhoto,
      frontRearPhoto: vehicle.frontRearPhoto,
      backRearPhoto: vehicle.backRearPhoto,
      lastInspectionDate: vehicle.lastInspectionDate,
      nextInspectionDue: vehicle.nextInspectionDue,
      verifiedByAdminId: vehicle.verifiedByAdminId?.toString(),
      verifiedAt: vehicle.verifiedAt,
      verificationNotes: vehicle.verificationNotes,
      rejectionReason: vehicle.rejectionReason,
      isActive: vehicle.isActive,
      isPrimary: vehicle.isPrimary,
      odometer: vehicle.odometer,
      features: vehicle.features,
      hasCompleteDocumentation: vehicle.hasCompleteDocumentation,
      lastDocumentVerificationCheck: vehicle.lastDocumentVerificationCheck,
      evpPrice: vehicle.evpPrice,
      evpPriceSet: vehicle.evpPriceSet,
      evpAdminGeneratedPending: vehicle.evpAdminGeneratedPending,
      evp: evp,
      createdAt: vehicle?.createdAt,
      updatedAt: vehicle?.updatedAt,
    };
  }
  private async mapToVehicleDetailsResponseDto(vehicle: Vehicle): Promise<VehicleResponseDto> {
    // Get active EVP for this vehicle
    let evp = null;

    console.log(vehicle, 'vehicle');
    try {
      const vehicleId = typeof vehicle._id === 'string' ? new Types.ObjectId(vehicle._id) : vehicle._id;
      const activeEvp = await this.driverEvpRepository.findOne({
        vehicleId: vehicleId,
        isActive: true,
        endDate: { $gt: new Date() },
        revokedAt: { $exists: false },
      });
      if (activeEvp) {
        evp = {
          _id: activeEvp._id.toString(),
          certificateNumber: activeEvp.certificateNumber,
          startDate: activeEvp.startDate,
          endDate: activeEvp.endDate,
          documentUrl: activeEvp.documentUrl,
          isActive: activeEvp.isActive,
          notes: activeEvp.notes,
        };
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch EVP for vehicle ${vehicle._id}:`, error);
    }
    let evpPrice = null;
    if (!evp) {
      try {
        const settings = await this.settingsModel.findOne().exec();
        evpPrice = settings.globalVehicleEvpPrice;
      } catch (error) {
        this.logger.warn(`Failed to fetch EVP price for vehicle ${vehicle._id}:`, error);
      }
    }

    return {
      _id: vehicle._id.toString(),
      driverId: vehicle.driverId.toString(),
      name: vehicle.name,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      licensePlate: vehicle.licensePlate,
      vin: vehicle.vin,
      status: vehicle.status,
      seatingCapacity: vehicle.seatingCapacity,
      vehicleType: vehicle.vehicleTypeId,
      backPhoto: vehicle.backPhoto,
      frontPhoto: vehicle.frontPhoto,
      leftPhoto: vehicle.leftPhoto,
      rightPhoto: vehicle.rightPhoto,
      frontRearPhoto: vehicle.frontRearPhoto,
      backRearPhoto: vehicle.backRearPhoto,
      lastInspectionDate: vehicle.lastInspectionDate,
      nextInspectionDue: vehicle.nextInspectionDue,
      verifiedByAdminId: vehicle.verifiedByAdminId?.toString(),
      verifiedAt: vehicle.verifiedAt,
      verificationNotes: vehicle.verificationNotes,
      rejectionReason: vehicle.rejectionReason,
      isActive: vehicle.isActive,
      isPrimary: vehicle.isPrimary,
      odometer: vehicle.odometer,
      features: vehicle.features,
      hasCompleteDocumentation: vehicle.hasCompleteDocumentation,
      lastDocumentVerificationCheck: vehicle.lastDocumentVerificationCheck,
      evpPrice: vehicle.status === VehicleStatus.VERIFIED ? (evpPrice ? evpPrice : null) : null,
      evpPriceSet: vehicle.status === VehicleStatus.VERIFIED ? (evpPrice ? true : false) : false,
      evpAdminGeneratedPending: vehicle.evpAdminGeneratedPending,
      evp: evp,
      createdAt: vehicle?.createdAt,
      updatedAt: vehicle?.updatedAt,
    };
  }

  async payForEvp(vehicleId: string, driverId: Types.ObjectId, payEvpDto: PayEvpDto): Promise<any> {
    try {
      const vehicleObjectId = new Types.ObjectId(vehicleId);
      const vehicle = await this.vehicleRepository.getVehicleById(vehicleObjectId);

      if (!vehicle) {
        throw new NotFoundException('Vehicle not found');
      }

      if (vehicle.driverId.toString() !== driverId.toString()) {
        throw new BadRequestException('Vehicle does not belong to this driver');
      }

      // Check if all vehicle documents are verified
      if (!vehicle.hasCompleteDocumentation) {
        throw new BadRequestException('All vehicle documents must be verified before paying for EVP');
      }

      // Check if EVP price is set by admin
      if (!vehicle.evpPrice || vehicle.evpPrice <= 0) {
        throw new BadRequestException('EVP price has not been set by admin yet');
      }

      // Check if there is already an active EVP for this vehicle
      const existingActiveEvp = await this.driverEvpRepository.findOne({
        vehicleId: vehicleObjectId,
        isActive: true,
        endDate: { $gt: new Date() }, // Not expired
        revokedAt: { $exists: false }, // Not revoked
      });

      if (existingActiveEvp) {
        throw new BadRequestException('Vehicle already has an active EVP');
      }

      // Check if there's already a completed payment (admin can generate EVP)
      // We don't check for pending payments here because driver might retry if previous attempt failed

      // Get or create driver wallet
      let driverWallet = await this.walletRepository.findOne({ user: driverId });
      if (!driverWallet) {
        driverWallet = await this.walletModel.create({
          _id: new Types.ObjectId(),
          user: driverId,
          depositBalance: 0,
          withdrawableBalance: 0,
          totalBalance: 0,
          totalDeposited: 0,
          lastTransactionDate: new Date(),
        });
      }

      const walletId = typeof driverWallet._id === 'string' ? new Types.ObjectId(driverWallet._id) : driverWallet._id;

      if (payEvpDto.paymentMethod === PaymentMethod.WALLET) {
        // Check wallet balance
        const balanceResult = await this.transactionModel.aggregate([
          {
            $match: {
              user: driverId,
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

        const walletBalance = balanceResult.length > 0 ? Math.max(0, balanceResult[0].balance) : 0;

        if (walletBalance < vehicle.evpPrice) {
          throw new BadRequestException(
            `Insufficient wallet balance. Your balance is RM${walletBalance.toFixed(
              2,
            )}, but the EVP price is RM${vehicle.evpPrice.toFixed(2)}`,
          );
        }

        // Deduct from wallet and create transaction
        const withdrawableBalanceBefore = walletBalance;
        const withdrawableBalanceAfter = withdrawableBalanceBefore - vehicle.evpPrice;
        const totalBalanceAfter = driverWallet.depositBalance + withdrawableBalanceAfter;

        // Generate transaction reference
        const transactionRef = this.generateTransactionRef(TransactionType.DEBIT, TransactionCategory.EVP_PAYMENT);

        const transaction = new this.transactionModel({
          _id: new Types.ObjectId(),
          transactionRef,
          user: driverId,
          wallet: walletId,
          type: TransactionType.DEBIT,
          status: TransactionStatus.COMPLETED,
          category: TransactionCategory.EVP_PAYMENT,
          balanceType: BalanceType.WITHDRAWABLE,
          amount: vehicle.evpPrice,
          currency: driverWallet.currency || 'MYR',
          currencySymbol: driverWallet.currencySymbol || 'RM',
          depositBalanceBefore: driverWallet.depositBalance,
          depositBalanceAfter: driverWallet.depositBalance,
          withdrawableBalanceBefore,
          withdrawableBalanceAfter,
          totalBalanceBefore: driverWallet.totalBalance,
          totalBalanceAfter,
          description: `EVP payment for vehicle ${vehicle.licensePlate}`,
          paymentMethod: PaymentMethod.WALLET,
          metadata: {
            vehicleId: vehicleId,
            evpPrice: vehicle.evpPrice,
          },
          completedAt: new Date(),
        });

        await transaction.save();

        // Update wallet
        await this.walletRepository.findOneAndUpdate(
          { _id: walletId },
          {
            withdrawableBalance: withdrawableBalanceAfter,
            totalBalance: totalBalanceAfter,
            lastTransactionDate: new Date(),
          },
        );

        // Payment is completed - evpPaymentPending defaults to false, so no need to update it
        // Admin can check for completed EVP_PAYMENT transactions to generate EVP
        await this.vehicleRepository.findOneAndUpdate(
          { _id: new Types.ObjectId(vehicleId) },
          { evpAdminGeneratedPending: true },
        );
        this.logger.log(`EVP payment completed for vehicle ${vehicleId} via wallet. Amount: RM${vehicle.evpPrice}`);

        return {
          success: true,
          message: 'EVP payment completed successfully',
          data: {
            transactionRef: transaction.transactionRef,
            amount: vehicle.evpPrice,
            paymentMethod: PaymentMethod.WALLET,
            vehicleId: vehicleId,
          },
        };
      } else if (payEvpDto.paymentMethod === PaymentMethod.CARD) {
        // Create pending transaction for card payment
        // Check for the most recent pending transaction
        // const completedTrnx = await this.transactionModel
        //   .findOne({
        //     category: TransactionCategory.EVP_PAYMENT,
        //     status: TransactionStatus.COMPLETED,
        //     amount: vehicle.evpPrice,
        //     'metadata.vehicleId': vehicleId,
        //   })
        //   .sort({ createdAt: -1 }) // Get the most recent transaction
        //   .exec();
        // if (completedTrnx) {
        //   throw new BadRequestException('EVP payment has already been completed');
        // }
        const pendingTrnx = await this.transactionModel
          .findOne({
            category: TransactionCategory.EVP_PAYMENT,
            status: TransactionStatus.PENDING,
            amount: vehicle.evpPrice,
            'metadata.vehicleId': vehicleId,
          })
          .sort({ createdAt: -1 }) // Get the most recent transaction
          .exec();

        if (pendingTrnx) {
          return {
            success: true,
            message: 'EVP payment Returned. Please complete the payment.',
            data: {
              transactionRef: pendingTrnx.transactionRef,
              transactionId: pendingTrnx._id.toString(),
              amount: vehicle.evpPrice,
              paymentMethod: PaymentMethod.CARD,
              vehicleId: vehicleId,
            },
          };
        }
        const transactionRef = this.generateTransactionRef(TransactionType.DEBIT, TransactionCategory.EVP_PAYMENT);

        const transaction = new this.transactionModel({
          _id: new Types.ObjectId(),
          transactionRef,
          user: driverId,
          wallet: walletId,
          type: TransactionType.DEBIT,
          status: TransactionStatus.PENDING,
          category: TransactionCategory.EVP_PAYMENT,
          balanceType: BalanceType.WITHDRAWABLE,
          amount: vehicle.evpPrice,
          currency: driverWallet.currency || 'MYR',
          currencySymbol: driverWallet.currencySymbol || 'RM',
          depositBalanceBefore: driverWallet.depositBalance,
          depositBalanceAfter: driverWallet.depositBalance,
          withdrawableBalanceBefore: driverWallet.withdrawableBalance,
          withdrawableBalanceAfter: driverWallet.withdrawableBalance,
          totalBalanceBefore: driverWallet.totalBalance,
          totalBalanceAfter: driverWallet.totalBalance,
          description: `EVP payment for vehicle ${vehicle.licensePlate}`,
          paymentMethod: PaymentMethod.CARD,
          metadata: {
            vehicleId: vehicleId,
            evpPrice: vehicle.evpPrice,
          },
        });

        await transaction.save();

        // Don't set evpPaymentPending here - only set it when payment is actually confirmed via webhook
        // If driver doesn't complete the payment, we don't want to mark it as pending
        // The evpPaymentPending flag will be set to false only when payment is confirmed in notificationUrl

        this.logger.log(`EVP payment initiated for vehicle ${vehicleId} via card. Transaction: ${transactionRef}`);

        return {
          success: true,
          message: 'EVP payment initiated. Please complete the payment.',
          data: {
            transactionRef: transaction.transactionRef,
            transactionId: transaction._id.toString(),
            amount: vehicle.evpPrice,
            paymentMethod: PaymentMethod.CARD,
            vehicleId: vehicleId,
          },
        };
      } else {
        throw new BadRequestException('Invalid payment method');
      }
    } catch (error) {
      this.logger.error(`Failed to process EVP payment for vehicle ${vehicleId}:`, error.stack);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to process EVP payment');
    }
  }

  private generateTransactionRef(type: TransactionType, category: TransactionCategory): string {
    const prefix = type === TransactionType.CREDIT ? 'CR' : 'DB';
    const categoryCode = category.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = generateRandomString(4).toUpperCase();

    return `${prefix}${categoryCode}${timestamp}${random}`;
  }
}
