import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '../database';
import { ApiProperty } from '@nestjs/swagger';
import { Document } from 'mongoose';

@Schema({ collection: 'settings', timestamps: true })
export class Settings extends AbstractDocument {
  @ApiProperty()
  @Prop({
    type: String,
    default: '',
  })
  privacyPolicy: string; // HTML string for privacy policy

  @ApiProperty()
  @Prop({
    type: String,
    default: '',
  })
  passengerTermsAndConditions: string; // HTML string for passenger terms and conditions

  @ApiProperty()
  @Prop({
    type: String,
    default: '',
  })
  driverTermsAndConditions: string; // HTML string for driver terms and conditions

  @ApiProperty()
  @Prop({
    type: Number,
    required: false,
    min: 0,
  })
  globalVehicleEvpPrice?: number; // Global EVP price for all vehicles

  @ApiProperty()
  @Prop({
    type: Number,
    required: false,
    min: 1,
  })
  globalVehicleEvpPeriod?: number; // Global EVP period in days (validity period)

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  privacyPolicyLastUpdated?: Date;

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  passengerTermsAndConditionsLastUpdated?: Date;

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  driverTermsAndConditionsLastUpdated?: Date;

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  evpPriceLastUpdated?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);
export type SettingsDocument = Settings & Document;

// Index for single document retrieval
SettingsSchema.index({ _id: 1 }, { unique: true });
