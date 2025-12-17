import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '../database';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

@Schema({ collection: 'permissions', timestamps: true })
export class Permission extends AbstractDocument {
  @ApiProperty()
  @Prop({
    type: String,
    required: true,
    unique: true,
    maxlength: 100,
  })
  name: string; // e.g., 'drivers.view', 'drivers.create', 'settings.manage'

  @ApiProperty()
  @Prop({
    type: String,
    required: true,
    maxlength: 200,
  })
  description: string;

  @ApiProperty()
  @Prop({
    type: String,
    required: true,
    maxlength: 50,
  })
  category: string; // e.g., 'drivers', 'passengers', 'settings', 'rides'

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: true,
  })
  isActive: boolean;
}

export const PermissionSchema = SchemaFactory.createForClass(Permission);
export type PermissionDocument = Permission & Document;

// Indexes for performance
PermissionSchema.index({ name: 1 });
PermissionSchema.index({ category: 1 });
PermissionSchema.index({ isActive: 1 });

