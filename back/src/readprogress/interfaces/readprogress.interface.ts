import {Types} from "mongoose";
import {ReadProgress, ReadProgressStatus} from "../schemas/readprogress.schema";
import {Book} from "../../books/schemas/book.schema";

export class UpdateReadProgress {
  time?: number;

  currentPage?: number;

  startDate?: Date;

  lastUpdateDate?:Date;

  endDate?: Date;

  status?: ReadProgressStatus;
}

export class CreateReadProgress extends UpdateReadProgress {
  book:Types.ObjectId;

  user:Types.ObjectId;

  serie:Types.ObjectId;
}

export class ReadProgressWithBook extends ReadProgress {
  bookInfo: Book;
}
