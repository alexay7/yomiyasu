import {Prop, Schema, SchemaFactory} from "@nestjs/mongoose";
import {SchemaTypes, Types} from "mongoose";
import {User} from "../../users/schemas/user.schema";
import {Book} from "../../books/schemas/book.schema";

export type ReadListDocument = ReadList & Document;

@Schema()
export class ReadList {
  _id: Types.ObjectId;

  @Prop({type: SchemaTypes.ObjectId, ref: User.name, required: true})
  user: Types.ObjectId;

  @Prop({type: SchemaTypes.ObjectId, ref: Book.name, required: true})
  book: Types.ObjectId;
}

export const ReadListSchema = SchemaFactory.createForClass(ReadList);

ReadListSchema.index({user: 1, book: 1}, {unique: true});
