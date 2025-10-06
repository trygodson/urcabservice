import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '../database';
import { Types, SchemaTypes, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Gender, Role } from '../enums';

@Schema({
  collection: 'user',
  timestamps: true,
})
export class User extends AbstractDocument {
  @ApiProperty()
  @Prop({
    type: Number,
    enum: Role,
    default: Role.PASSENGER,
    maxlength: 20,
  })
  type?: number;

  @ApiProperty()
  @Prop({
    type: String,
    enum: Gender,
    maxlength: 20,
    required: false,
  })
  gender?: string;

  @ApiProperty()
  @Prop({
    type: String,
    maxlength: 64,
    required: false,
  })
  fullName?: string;

  @ApiProperty()
  @Prop({
    type: String,
    maxlength: 30,
    required: false,
    unique: true,
    sparse: true,
  })
  userName?: string;

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  dob?: Date;

  @ApiProperty()
  @Prop({
    type: String,
    maxlength: 256,
    required: false,
    select: false,
  })
  passwordHash?: string;

  @ApiProperty()
  @Prop({
    type: String,
    maxlength: 256,
    required: false,
    select: false,
  })
  passwordSalt?: string;

  @ApiProperty()
  @Prop({
    type: String,
    maxlength: 64,
    unique: true,
    required: false,
    sparse: true,
  })
  email?: string;

  @ApiProperty()
  @Prop({
    type: String,
    maxlength: 64,
    required: false,
  })
  phone?: string;

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: true,
    select: false,
  })
  isFirstTime?: boolean;

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
    select: false,
  })
  lastLoginDate?: Date;

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  loginFailedDate?: Date;

  @ApiProperty()
  @Prop({
    type: Number,
    required: false,
    select: false,
  })
  loginFailedCount?: number;

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: false,
  })
  isEmailConfirmed?: boolean;

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: false,
  })
  isPhoneConfirmed?: boolean;

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: true,
  })
  isActive?: boolean;

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
    select: false,
  })
  emailConfirmationDate?: Date;

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  emailConfirmationExpiryDate?: Date;

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
    select: false,
  })
  phoneConfirmationDate?: Date;

  @ApiProperty()
  @Prop({
    type: String,
    maxlength: 64,
    required: false,
  })
  emailConfirmationCode?: string;

  @ApiProperty()
  @Prop({
    type: String,
    maxlength: 64,
    required: false,
  })
  phoneConfirmationCode?: string;

  @ApiProperty()
  @Prop({
    type: String,
    required: false,
  })
  photo?: string;

  @ApiProperty()
  @Prop({
    type: String,
    required: false,
  })
  fcmToken?: string;

  @ApiProperty()
  @Prop({
    type: Number,
    required: false,
    select: false,
  })
  resetPasswordCount?: number;

  @ApiProperty()
  @Prop({ type: String, required: false, select: false })
  resetPasswordOtp?: string;

  @ApiProperty()
  @Prop({ type: Date, required: false, select: false })
  resetPasswordOtpExpiry?: Date;

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: false,
  })
  isPhotoUpload?: boolean;

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: false,
  })
  isProfileUpdated?: boolean;

  // @ApiProperty()
  // @Prop({
  //   type: String,
  //   required: false,
  //   select: false,
  // })
  // deviceToken?: string;

  @ApiProperty()
  @Prop({
    type: String,
    maxlength: 64,
    required: false,
  })
  longitude?: string;

  @ApiProperty()
  @Prop({
    type: String,
    maxlength: 64,
    required: false,
  })
  latitude?: string;

  // New fields for onboardin

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: false,
  })
  isOnboardingComplete?: boolean;

  // Driver-specific fields for document verification
  @ApiProperty()
  @Prop({
    type: Boolean,
    default: false,
  })
  hasCompleteDocumentation?: boolean; // Computed field based on DriverDocuments

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  lastDocumentVerificationCheck?: Date; // Last time document status was verified

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: false,
  })
  isDriverVerified?: boolean; // Overall driver verification status

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  driverVerifiedAt?: Date;

  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
    required: false,
  })
  driverVerifiedByAdminId?: Types.ObjectId;

  // Ranking fields (computed later from league performance)
  // @ApiProperty()
  // @Prop({
  //   type: String,
  //   enum: ['ROOKIE', 'SUPPORTER', 'ULTRA', 'LEGEND', 'ICON'],
  //   default: 'ROOKIE',
  // })
  // rankingTier?: string;

  // @ApiProperty()
  // @Prop({
  //   type: Number,
  //   default: 0,
  // })
  // rankingPoints?: number;
}

export const UserSchema = SchemaFactory.createForClass(User);
export type UserDocument = User & Document;

// Indexes for performance
UserSchema.index({ email: 1 });
UserSchema.index({ userName: 1 });
UserSchema.index({ phone: 1 });
UserSchema.index({ type: 1 });
UserSchema.index({ isDriverVerified: 1 });
UserSchema.index({ hasCompleteDocumentation: 1 });
UserSchema.index({ country: 1 });
