import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type BankAccountDocument = BankAccount & Document;

@Schema({
  collection: 'bankAccount',
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false },
  toObject: { virtuals: true, versionKey: false },
})
export class BankAccount {
  _id: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: String, required: true, maxlength: 100 })
  bankName: string;

  @ApiProperty()
  @Prop({ type: String, required: true, maxlength: 50 })
  accountNumber: string;

  @ApiProperty()
  @Prop({ type: String, required: true, maxlength: 100 })
  accountName: string;

  @ApiProperty()
  @Prop({ type: String, required: false, maxlength: 20 })
  bankCode?: string; // Swift code, routing number, etc.

  @ApiProperty()
  @Prop({ type: String, required: false, maxlength: 100 })
  branchName?: string;

  @ApiProperty()
  @Prop({ type: String, required: false, maxlength: 50 })
  accountType?: string; // e.g., 'savings', 'current', 'checking'

  @ApiProperty()
  @Prop({ type: Boolean, default: false })
  isDefault: boolean; // Default account for withdrawals

  @ApiProperty()
  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @ApiProperty()
  @Prop({ type: String, required: false, maxlength: 500 })
  notes?: string; // User's notes about this account

  createdAt?: Date;
  updatedAt?: Date;
}

export const BankAccountSchema = SchemaFactory.createForClass(BankAccount);

// Add indexes
BankAccountSchema.index({ user: 1, isDefault: 1 });
BankAccountSchema.index({ user: 1, isActive: 1 });
BankAccountSchema.index({ user: 1, createdAt: -1 });

// Ensure only one default account per user
BankAccountSchema.pre('save', async function (next) {
  if (this.isDefault && this.isModified('isDefault')) {
    // Unset other default accounts for this user
    const model = this.constructor as any;
    await model.updateMany(
      { user: this.user, _id: { $ne: this._id } },
      { $set: { isDefault: false } },
    );
  }
  next();
});
