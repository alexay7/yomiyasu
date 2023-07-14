import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { SchemaTypes, Types } from "mongoose";
import { Serie } from "../../series/schemas/series.schema";
import { User } from "../../users/schemas/user.schema";

export type SeriesProgressDocument = SeriesProgress & Document;

@Schema()
export class SeriesProgress {
  _id: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: User.name, required: true })
  user: Types.ObjectId;

  @Prop({ type: String, required: true })
  serie: string;

  @Prop({ type: Date, default: new Date() })
  startDate: Date;
}

export const SeriesProgressSchema = SchemaFactory.createForClass(SeriesProgress);
