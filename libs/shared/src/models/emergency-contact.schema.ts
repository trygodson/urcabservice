import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '../database';
import { Types, SchemaTypes, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.schema';

@Schema({ collection: 'emergencycontacts', timestamps: true })
export class EmergencyContact extends AbstractDocument {
  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
    required: true,
  })
  userId: Types.ObjectId;

  @ApiProperty()
  @Prop({
    type: String,
    required: true,
    maxlength: 100,
  })
  name: string;

  @ApiProperty()
  @Prop({
    type: String,
    required: true,
    maxlength: 20,
  })
  phoneNumber: string;

  @ApiProperty()
  @Prop({
    type: String,
    required: false,
    maxlength: 100,
  })
  email?: string;

  @ApiProperty()
  @Prop({
    type: String,
    required: true,
    maxlength: 50,
  })
  relationship: string; // e.g., 'spouse', 'parent', 'sibling', 'friend'

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: true,
  })
  isActive: boolean;

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: false,
  })
  isPrimary: boolean; // One primary contact per user

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: true,
  })
  notifyOnRideStart: boolean;

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: false,
  })
  notifyOnEmergency: boolean;

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: false,
  })
  notifyOnLateArrival: boolean;

  @ApiProperty()
  @Prop({
    type: Number,
    default: 30,
    min: 5,
    max: 120,
  })
  lateArrivalThresholdMinutes: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const EmergencyContactSchema = SchemaFactory.createForClass(EmergencyContact);
export type EmergencyContactDocument = EmergencyContact & Document;

// Indexes for performance
EmergencyContactSchema.index({ userId: 1 });
EmergencyContactSchema.index({ userId: 1, isPrimary: 1 });
EmergencyContactSchema.index({ userId: 1, isActive: 1 });
