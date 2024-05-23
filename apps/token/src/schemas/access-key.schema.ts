import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class AccessKey extends Document {
  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ required: true })
  rateLimit: number;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  isDisabled: boolean;
}

export const AccessKeySchema = SchemaFactory.createForClass(AccessKey);
