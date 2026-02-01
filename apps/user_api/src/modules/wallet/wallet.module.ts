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
  BankAccount,
  BankAccountSchema,
  WithdrawalRequest,
  WithdrawalRequestSchema,
} from '@urcab-workspace/shared';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: Wallet.name, schema: WalletSchema },
      { name: User.name, schema: UserSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
      { name: BankAccount.name, schema: BankAccountSchema },
      { name: WithdrawalRequest.name, schema: WithdrawalRequestSchema },
    ]),
  ],
  controllers: [WalletController],
  providers: [WalletService, WalletRepository, UserRepository],
  exports: [WalletService],
})
export class WalletModule {}
