import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type UserTokenDocument = UserToken & Document;

@Schema()
export class UserToken {
  _id?: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, required: true, ref: User.name })
  user: Types.ObjectId;

  @Prop({ type: String, required: true })
  uuid: string;

  @Prop({ type: String })
  refreshToken: string | null;
}

export const UserTokenSchema = SchemaFactory.createForClass(UserToken);
