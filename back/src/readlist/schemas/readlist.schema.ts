import {Prop, Schema, SchemaFactory} from "@nestjs/mongoose";
import {SchemaTypes, Types} from "mongoose";
import {User} from "../../users/schemas/user.schema";
import {Serie} from "../../series/schemas/series.schema";

export type ReadListDocument = ReadList & Document;

@Schema()
export class ReadList {
  _id: Types.ObjectId;

  @Prop({type: SchemaTypes.ObjectId, ref: User.name, required: true})
  user: Types.ObjectId;

  @Prop({type: SchemaTypes.ObjectId, ref: Serie.name, required: true})
  serie: Types.ObjectId;

  @Prop({type:Date, default:new Date()})
  addedDate:Date;
}

export const ReadListSchema = SchemaFactory.createForClass(ReadList);

ReadListSchema.index({user: 1, serie: 1}, {unique: true});
