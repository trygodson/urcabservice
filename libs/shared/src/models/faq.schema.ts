import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '../database';
import { SchemaTypes, Types, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.schema';

@Schema({ collection: 'faqs', timestamps: true })
export class Faq extends AbstractDocument {
  @ApiProperty({ description: 'FAQ question' })
  @Prop({
    type: String,
    required: true,
  })
  question: string;

  @ApiProperty({ description: 'FAQ answer' })
  @Prop({
    type: String,
    required: true,
  })
  answer: string;

  @ApiProperty({ description: 'FAQ category (e.g., Driver, Passenger, Booking, etc.)' })
  @Prop({
    type: String,
    required: false,
    default: 'Driver',
  })
  category?: string;

  @ApiProperty({ description: 'Display order for sorting FAQs' })
  @Prop({
    type: Number,
    required: false,
    default: 0,
  })
  order?: number;

  @ApiProperty({ description: 'Whether the FAQ is active and visible' })
  @Prop({
    type: Boolean,
    default: true,
  })
  isActive: boolean;

  @ApiProperty({ description: 'Number of times this FAQ has been viewed' })
  @Prop({
    type: Number,
    default: 0,
  })
  viewCount?: number;

  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
    required: false,
  })
  createdBy?: Types.ObjectId;

  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
    required: false,
  })
  updatedBy?: Types.ObjectId;
}

export const FaqSchema = SchemaFactory.createForClass(Faq);

// Indexes for performance
FaqSchema.index({ category: 1, isActive: 1 });
FaqSchema.index({ order: 1 });
FaqSchema.index({ isActive: 1 });

export type FaqDocument = Faq & Document;
