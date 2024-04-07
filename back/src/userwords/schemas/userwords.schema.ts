import {Schema, Prop, SchemaFactory} from "@nestjs/mongoose";
import {Document, Schema as MongoSchema, SchemaTypes, Types} from "mongoose";
import {User} from "../../users/schemas/user.schema";

export type UserWordsDocument = UserWords & Document;

@Schema({_id:false})
export class UserWord {
  @Prop({type:String, required:true})
  word:string;

  @Prop({type:String, required:true})
  display:string;

  @Prop({type:String, required:true})
  sentence:string;

  @Prop({type:[String], required:true})
  meaning:string[];

  @Prop({type:String, required:true})
  reading:string;

  @Prop({type:Number, required:true})
  frequency:number;

  @Prop({type:[Number], required:true})
  pitch:number[];

  @Prop({type:Date, default:Date.now})
  createdAt?:Date;
}

@Schema()
export class UserWords {
  _id?: MongoSchema.Types.ObjectId;

  @Prop({type: SchemaTypes.ObjectId, ref: User.name, required: true})
  user: Types.ObjectId;

  @Prop({type: SchemaTypes.Array, required:true})
  words:UserWord[];
}

export const UserWordsSchema = SchemaFactory.createForClass(UserWords);

UserWordsSchema.index({user:1}, {unique:true});
