import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '../database';
import { Types, SchemaTypes, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationPriority, NotificationStatus, NotificationType } from '../enums';
import { User } from './user.schema';

@Schema({ collection: 'notifications', timestamps: true })
export class Notification extends AbstractDocument {
  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
    required: true,
  })
  userId: Types.ObjectId; // Recipient of the notification

  @ApiProperty()
  @Prop({
    type: String,
    enum: NotificationType,
    required: true,
  })
  type: string;

  @ApiProperty()
  @Prop({
    type: String,
    required: true,
    maxlength: 200,
  })
  title: string;

  @ApiProperty()
  @Prop({
    type: String,
    required: true,
    maxlength: 1000,
  })
  message: string;

  @ApiProperty()
  @Prop({
    type: String,
    enum: NotificationStatus,
    default: NotificationStatus.SENT,
  })
  status: string;

  @ApiProperty()
  @Prop({
    type: String,
    enum: NotificationPriority,
    default: NotificationPriority.MEDIUM,
  })
  priority: string;

  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    required: false,
  })
  relatedEntityId?: Types.ObjectId; // ID of related entity (ride, subscription, etc.)

  @ApiProperty()
  @Prop({
    type: String,
    required: false,
    maxlength: 50,
  })
  relatedEntityType?: string; // Type of related entity ('ride', 'subscription', 'issue')

  @ApiProperty()
  @Prop({
    type: Object,
    required: false,
  })
  data?: any; // Additional data for the notification

  @ApiProperty()
  @Prop({
    type: String,
    required: false,
    maxlength: 200,
  })
  actionUrl?: string; // Deep link or URL for action

  @ApiProperty()
  @Prop({
    type: String,
    required: false,
    maxlength: 100,
  })
  actionText?: string; // Text for action button

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  scheduledAt?: Date; // For scheduled notifications

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  sentAt?: Date;

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  deliveredAt?: Date;

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  readAt?: Date;

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  expiresAt?: Date; // When the notification expires

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: false,
  })
  isPushSent: boolean; // Whether push notification was sent

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: false,
  })
  isEmailSent: boolean; // Whether email was sent

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: false,
  })
  isSMSSent: boolean; // Whether SMS was sent

  @ApiProperty()
  @Prop({
    type: String,
    required: false,
    maxlength: 100,
  })
  pushNotificationId?: string; // FCM message ID

  @ApiProperty()
  @Prop({
    type: String,
    required: false,
    maxlength: 500,
  })
  errorMessage?: string; // Error message if delivery failed

  @ApiProperty()
  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  retryCount: number; // Number of delivery attempts

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  lastRetryAt?: Date;

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: false,
  })
  isSystem: boolean; // Whether this is a system-generated notification

  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
    required: false,
  })
  createdByAdminId?: Types.ObjectId; // If created by admin

  @ApiProperty()
  @Prop({
    type: [String],
    default: [],
  })
  tags?: string[]; // Tags for categorization
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
export type NotificationDocument = Notification & Document;

// Indexes for performance
NotificationSchema.index({ userId: 1 });
NotificationSchema.index({ userId: 1, status: 1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ type: 1 });
NotificationSchema.index({ scheduledAt: 1 });
NotificationSchema.index({ expiresAt: 1 });
NotificationSchema.index({ relatedEntityId: 1, relatedEntityType: 1 });
NotificationSchema.index({ priority: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, readAt: 1 });
