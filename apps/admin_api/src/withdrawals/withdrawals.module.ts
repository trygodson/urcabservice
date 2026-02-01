import { Module } from '@nestjs/common';
import {
  DatabaseModule,
  WithdrawalRequest,
  WithdrawalRequestSchema,
  WalletTransaction,
  WalletTransactionSchema,
  Wallet,
  WalletSchema,
  WalletRepository,
  User,
  UserSchema,
  BankAccount,
  BankAccountSchema,
} from '@urcab-workspace/shared';
import { WithdrawalsController } from './withdrawals.controller';
import { WithdrawalsService } from './withdrawals.service';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: WithdrawalRequest.name, schema: WithdrawalRequestSchema },
      { name: BankAccount.name, schema: BankAccountSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
      { name: Wallet.name, schema: WalletSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [WithdrawalsController],
  providers: [WithdrawalsService, WalletRepository],
  exports: [WithdrawalsService],
})
export class WithdrawalsModule {}
