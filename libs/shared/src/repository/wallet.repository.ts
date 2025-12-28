import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AbstractRepository } from '../database';
import { Wallet, WalletDocument } from '../models/wallet.schema';
import { User, UserDocument } from '../models/user.schema';
import { Role } from '../enums';

@Injectable()
export class WalletRepository extends AbstractRepository<WalletDocument> {
  protected logger = new Logger(WalletRepository.name);
  constructor(
    @InjectModel(Wallet.name)
    walletModel: Model<WalletDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {
    super(walletModel);
  }

  async findAdminWallet(): Promise<WalletDocument | null> {
    // First, find the super admin user
    const superAdmin = await this.userModel.findOne({ type: Role.SUPER_ADMIN }).exec();

    if (!superAdmin) {
      this.logger.warn('Super admin user not found');
      return null;
    }
    // console.log(superAdmin, 'superAdmin._id');
    // Then find their wallet
    const wallet = await this.findOne({ user: superAdmin._id.toString() });

    return wallet;
  }
}
