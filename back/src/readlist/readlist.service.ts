import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ReadList } from './schemas/readlist.schema';
import { Model, Types } from 'mongoose';
import { CreateReadList } from './interfaces/readlist.interface';

@Injectable()
export class ReadlistService {
  constructor(
    @InjectModel(ReadList.name) private readonly readListModel: Model<ReadList>,
  ) {}

  create(createReadList: CreateReadList) {
    return this.readListModel.create(createReadList);
  }

  getUserReadListBooks(user: Types.ObjectId) {
    return this.readListModel
      .aggregate()
      .match({ user: new Types.ObjectId(user) })
      .lookup({
        from: 'books',
        localField: 'book',
        foreignField: '_id',
        as: 'bookInfo',
      });
  }

  removeBookFromUserList(user: Types.ObjectId, book: Types.ObjectId) {
    return this.readListModel.deleteOne({ user, book });
  }
}
