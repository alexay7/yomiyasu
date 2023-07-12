import { Types } from 'mongoose';
import { ReadProgress } from '../schemas/readprogress.schema';
import { Book } from '../../books/schemas/book.schema';

export interface CreateReadProgress {
  book: Types.ObjectId;

  user: Types.ObjectId;
}

export class UpdateReadProgress {
  time: number;

  currentPage: number;

  endDate?: Date;

  completed?: boolean;
}

export class ReadProgressWithBook extends ReadProgress {
  bookInfo: Book;
}
