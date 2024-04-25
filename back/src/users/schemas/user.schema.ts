import {Schema, Prop, SchemaFactory} from "@nestjs/mongoose";
import {Document, Types} from "mongoose";

export type UserDocument = User & Document;

@Schema()
export class User {
  _id?: Types.ObjectId;

  @Prop({type: String, required: true, unique: true})
  username: string;

  @Prop({type: String, required: true, unique: true})
  email: string;

  @Prop({type: String, required: true})
  password: string;

  @Prop({type: String})
  refreshToken: string | null;

  @Prop({type:Boolean, default:false})
  admin:boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({username:1}, {unique:true});
UserSchema.index({email:1}, {unique:true});
