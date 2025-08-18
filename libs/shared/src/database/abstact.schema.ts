import { Prop, Schema } from '@nestjs/mongoose';
import { SchemaTypes, Types } from 'mongoose';

@Schema()
export class AbstractDocument {
  @Prop({ type: SchemaTypes.ObjectId })
  _id: Types.ObjectId;

  // @Prop({ type: Date })
  // createdAt?: any;

  // @Prop({ type: Date })
  // updatedAt?: any;
}
