import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export enum WithdrawalRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PROCESSING = 'PROCESSING',
}

export type WithdrawalRequestDocument = WithdrawalRequest & Document;

@Schema({
  collection: 'withdrawalRequest',
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false },
  toObject: { virtuals: true, versionKey: false },
})
export class WithdrawalRequest {
  _id: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'Wallet', required: true })
  wallet: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'BankAccount', required: true })
  bankAccount: Types.ObjectId; // Reference to bank account

  @ApiProperty()
  @Prop({ type: Number, required: true, min: 0.01 })
  amount: number;

  @ApiProperty()
  @Prop({ type: String, required: false })
  currency: string;

  @ApiProperty()
  @Prop({ type: String, required: false })
  currencySymbol: string;

  @ApiProperty()
  @Prop({ type: String, enum: WithdrawalRequestStatus, default: WithdrawalRequestStatus.PENDING })
  status: WithdrawalRequestStatus;

  @ApiProperty()
  @Prop({ type: String, required: false, maxlength: 500 })
  notes?: string; // User's notes

  @ApiProperty()
  @Prop({ type: String, required: false, maxlength: 500 })
  adminNotes?: string; // Admin's internal notes

  @ApiProperty()
  @Prop({ type: String, required: false, maxlength: 500 })
  rejectionReason?: string;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  processedBy?: Types.ObjectId; // Admin who processed it

  @ApiProperty()
  @Prop({ type: Date, required: false })
  processedAt?: Date;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'WalletTransaction', required: false })
  transactionId?: Types.ObjectId; // Link to the DEBIT transaction when approved

  createdAt?: Date;
  updatedAt?: Date;
}

export const WithdrawalRequestSchema = SchemaFactory.createForClass(WithdrawalRequest);

// Add indexes
WithdrawalRequestSchema.index({ user: 1, createdAt: -1 });
WithdrawalRequestSchema.index({ status: 1 });
WithdrawalRequestSchema.index({ wallet: 1 });
WithdrawalRequestSchema.index({ bankAccount: 1 });
