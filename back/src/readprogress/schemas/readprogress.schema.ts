import {Prop, Schema, SchemaFactory} from "@nestjs/mongoose";
import {Document, SchemaTypes, Types} from "mongoose";
import {User} from "../../users/schemas/user.schema";
import {Book} from "../../books/schemas/book.schema";
import {Serie} from "../../series/schemas/series.schema";

export type ReadProgressDocument = ReadProgress & Document;

export type ReadProgressStatus = "unread" | "reading" | "completed";

@Schema({optimisticConcurrency:true})
export class ReadProgress {
  _id?: Types.ObjectId;

  @Prop({type: SchemaTypes.ObjectId, ref: User.name, required: true})
  user: Types.ObjectId;

  @Prop({type: SchemaTypes.ObjectId, ref: Book.name, required: true})
  book: Types.ObjectId;

  @Prop({type:SchemaTypes.ObjectId, ref:Serie.name, required:true})
  serie:Types.ObjectId;

  @Prop({type: Date})
  startDate: Date;

  @Prop({type:Date, default:new Date()})
  lastUpdateDate:Date;

  @Prop({type: Date})
  endDate: Date;

  // Time in seconds
  @Prop({type: Number, default: 0})
  time: number;

  @Prop({type: Number, default: 1})
  currentPage: number;

  @Prop({
      type: String,
      default: "unread"
  })
  status: ReadProgressStatus;

  @Prop({type: Boolean, default: false})
  paused: boolean;

  @Prop({type:Number, default:0})
  characters:number;
}

export const ReadProgressSchema = SchemaFactory.createForClass(ReadProgress);