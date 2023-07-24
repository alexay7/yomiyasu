import {IsString} from "class-validator";
import {Types} from "mongoose";

export class DeleteReadprogressDto {
  @IsString()
  book: Types.ObjectId;
}
