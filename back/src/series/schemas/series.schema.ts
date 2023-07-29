import {Prop, Schema, SchemaFactory} from "@nestjs/mongoose";
import {Document, Types} from "mongoose";

export type SerieDocument = Serie & Document;

@Schema()
export class Serie {
  _id: Types.ObjectId;

  // Con este parámetro se identificarán las series en el cronjob
  @Prop({type: String, required: true, unique: true})
  path: string;

  @Prop({type: String, required: true})
  visibleName: string;

  @Prop({type: String, required: true})
  sortName: string;

  @Prop({type: Number, default: 0})
  bookCount: number;

  @Prop({type: Date, default: new Date()})
  lastModifiedDate: Date;

  @Prop({type:Number, default:0})
  difficulty:number;

  @Prop({type: Date, default: new Date()})
  createdDate: Date;

  @Prop({type: String, enum: ["PUBLISHING", "ENDED"]})
  status?: string;

  @Prop({type: String, default: ""})
  summary?: string;

  @Prop({type:[String], default:[]})
  authors:string[];

  @Prop({type: [String], default: []})
  genres: string[];

  @Prop({type: Boolean, default: false})
  missing: boolean;
}

export const SerieSchema = SchemaFactory.createForClass(Serie);
