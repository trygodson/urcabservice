import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '../database';
import { Types, SchemaTypes, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.schema';
import { Permission } from './permission.schema';

@Schema({ collection: 'roles', timestamps: true })
export class AdminRole extends AbstractDocument {
  @ApiProperty()
  @Prop({
    type: String,
    required: true,
    unique: true,
    maxlength: 100,
  })
  name: string; // e.g., 'Support Admin', 'Fleet Manager', 'Finance Admin'

  @ApiProperty()
  @Prop({
    type: String,
    required: false,
    maxlength: 500,
  })
  description?: string;

  @ApiProperty()
  @Prop({
    type: [SchemaTypes.ObjectId],
    ref: Permission.name,
    default: [],
  })
  permissions: Types.ObjectId[];

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
  isSystemRole: boolean; // System roles cannot be deleted

  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: false,
  })
  createdBy?: Types.ObjectId;

  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: false,
  })
  updatedBy?: Types.ObjectId;
}

export const RoleSchema = SchemaFactory.createForClass(AdminRole);
export type RoleDocument = AdminRole & Document;

// Indexes for performance
RoleSchema.index({ name: 1 });
RoleSchema.index({ isActive: 1 });
RoleSchema.index({ isSystemRole: 1 });
