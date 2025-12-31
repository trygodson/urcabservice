import { Module } from '@nestjs/common';
import {
  DatabaseModule,
  WalletTransaction,
  WalletTransactionSchema,
  User,
  UserSchema,
  Ride,
  RideSchema,
} from '@urcab-workspace/shared';
import { PassengerTransactionsController } from './passenger-transactions.controller';
import { PassengerTransactionsService } from './passenger-transactions.service';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
      { name: User.name, schema: UserSchema },
      { name: Ride.name, schema: RideSchema },
    ]),
  ],
  controllers: [PassengerTransactionsController],
  providers: [PassengerTransactionsService],
  exports: [PassengerTransactionsService],
})
export class PassengerTransactionsModule {}

