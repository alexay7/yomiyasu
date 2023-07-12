import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BookDocument = Book & Document;

@Schema()
export class Book {
  _id?: Types.ObjectId;

  @Prop({ type: String, required: true, unique: true })
  path: string;

  @Prop({ type: String, require: true })
  serie: string;

  @Prop({ type: Number, required: true })
  pages: number;

  @Prop({ type: String, required: true })
  visibleName: string;

  @Prop({ type: String, required: true })
  sortName: string;

  @Prop({ type: String, required: true })
  imagesFolder: string;

  @Prop({ type: String, required: true })
  thumbnailPath: string;

  @Prop({ type: Date })
  releaseDate?: Date;

  @Prop({ type: Date, default: new Date() })
  createdDate: Date;

  @Prop({ type: String, default: '' })
  summary?: string;

  @Prop({ type: [String], default: [] })
  authors?: string[];

  @Prop({ type: Boolean, default: false })
  missing: boolean;
}

export const BookSchema = SchemaFactory.createForClass(Book);
