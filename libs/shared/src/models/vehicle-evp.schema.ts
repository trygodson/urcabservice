import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '../database';
import { SchemaTypes, Types, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.schema';
import { Vehicle } from './vehicle.schema';
import { WalletTransaction } from './walletTransaction.schema';
import { VehicleEvpStatus } from '../enums';

/**
 * Electronic Verification Permit (EVP) for vehicles with verified documents
 */
@Schema({ collection: 'vehicleEvp', timestamps: true })
export class VehicleEvp extends AbstractDocument {
  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: Vehicle.name,
    required: true,
  })
  vehicleId: Types.ObjectId;

  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: WalletTransaction.name,
    // required: true,
  })
  transactionId?: Types.ObjectId;

  @ApiProperty()
  @Prop({
    type: String,
    required: true,
  })
  price?: number;

  @ApiProperty()
  @Prop({
    type: String,
    required: true,
  })
  certificateNumber?: string;

  @ApiProperty()
  @Prop({
    type: Date,
    required: true,
  })
  startDate: Date;

  @ApiProperty()
  @Prop({
    type: Date,
    required: true,
  })
  endDate: Date;

  @ApiProperty()
  @Prop({
    type: String,
    required: true,
  })
  documentUrl: string;

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: true,
  })
  isActive: boolean;

  @ApiProperty()
  @Prop({
    type: String,
    enum: ['active', 'expired', 'revoked'],
    default: 'active',
  })
  status: string;

  @ApiProperty()
  @Prop({
    type: String,
    maxlength: 500,
  })
  notes?: string;

  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
    required: true,
  })
  issuedBy: Types.ObjectId;

  @ApiProperty()
  @Prop({
    type: Date,
  })
  revokedAt?: Date;

  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
  })
  revokedBy?: Types.ObjectId;
}

export const VehicleEvpSchema = SchemaFactory.createForClass(VehicleEvp);
export type VehicleEvpDocument = VehicleEvp & Document;

// Keep DriverEvp for backward compatibility (deprecated)
export const DriverEvp = VehicleEvp;
export const DriverEvpSchema = VehicleEvpSchema;
export type DriverEvpDocument = VehicleEvpDocument;
