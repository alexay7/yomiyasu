import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Book } from '../../books/schemas/book.schema';

export type ReadProgressDocument = ReadProgress & Document;

@Schema()
export class ReadProgress {
  _id: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: User.name, required: true })
  user: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: Book.name, required: true })
  book: Types.ObjectId;

  @Prop({ type: Date, default: new Date() })
  startDate: Date;

  @Prop({ type: Date })
  endDate: Date;

  // Time in seconds
  @Prop({ type: Number, default: 0 })
  time: number;

  @Prop({ type: Number, default: 1 })
  currentPage: number;

  @Prop({
    type: Boolean,
    default: false,
  })
  completed: boolean;
}

export const ReadProgressSchema = SchemaFactory.createForClass(ReadProgress);
