import { Module } from '@nestjs/common';
import {
  DatabaseModule,
  User,
  UserRepository,
  UserSchema,
  Wallet,
  WalletRepository,
  WalletSchema,
  WalletTransaction,
  WalletTransactionSchema,
} from '@urcab-workspace/shared';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: Wallet.name, schema: WalletSchema },
      { name: User.name, schema: UserSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
    ]),
  ],
  controllers: [WalletController],
  providers: [WalletService, WalletRepository, UserRepository],
  exports: [WalletService],
})
export class WalletModule {}
