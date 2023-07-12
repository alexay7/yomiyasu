import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ReadProgress } from './schemas/readprogress.schema';
import { Model, Types } from 'mongoose';
import {
  CreateReadProgress,
  ReadProgressWithBook,
  UpdateReadProgress,
} from './interfaces/readprogress.interface';

@Injectable()
export class ReadprogressService {
  constructor(
    @InjectModel(ReadProgress.name)
    private readonly readProgressModel: Model<ReadProgress>,
  ) {}

  create(createReadProgress: CreateReadProgress) {
    return this.readProgressModel.create(createReadProgress);
  }

  async findNonFinished(
    user: Types.ObjectId,
    book: Types.ObjectId,
    bookInfo?: boolean,
  ): Promise<ReadProgress | ReadProgressWithBook | null> {
    if (!bookInfo) {
      return this.readProgressModel.findOne({ user, book, completed: false });
    } else {
      const result = await this.readProgressModel
        .aggregate()
        .match({
          user: new Types.ObjectId(user),
          book: new Types.ObjectId(book),
          completed: false,
        })
        .lookup({
          from: 'books',
          localField: 'book',
          foreignField: '_id',
          as: 'bookInfo',
        })
        .unwind({ path: '$bookInfo' });

      if (result && result.length > 0) {
        return result[0];
      }

      return null;
    }
  }

  updateProgress(
    user: Types.ObjectId,
    book: Types.ObjectId,
    updateProgress: UpdateReadProgress,
  ) {
    return this.readProgressModel.findOneAndUpdate(
      { user, book, completed: false },
      updateProgress,
      { new: true },
    );
  }
}
