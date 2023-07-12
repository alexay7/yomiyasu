import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Book, BookDocument } from './schemas/book.schema';
import { Model, Types } from 'mongoose';

@Injectable()
export class BooksService {
  constructor(@InjectModel(Book.name) private bookModel: Model<BookDocument>) {}
  private readonly logger = new Logger(BooksService.name);

  async findById(id: Types.ObjectId): Promise<Book | null> {
    return this.bookModel.findById(id);
  }

  async updateOrCreate(newBook: {
    path: string;
    visibleName: string;
    sortName: string;
    imagesFolder: string;
    serie: string;
    pages: number;
  }): Promise<Book | null> {
    const found = await this.bookModel.findOne({ path: newBook.path });

    /**
     * Si existe es que se ha encontrado un libro que fue
     * marcado como borrado. Quitar la marca.
     */

    if (found) {
      this.logger.log(
        '\x1b[34m' + newBook.path + ' restaurada a la biblioteca',
      );
      return this.bookModel.findOneAndUpdate(
        { path: newBook.path },
        { missing: false },
      );
    }
    // Si no existe, crearlo
    this.logger.log('\x1b[34m' + newBook.path + ' añadido a la biblioteca');
    return this.bookModel.create(newBook);
  }

  findNonMissing(): Promise<Book[]> {
    return this.bookModel.find({ missing: false });
  }

  findMissing(): Promise<Book[]> {
    return this.bookModel.find({ missing: true });
  }

  markAsMissing(path: string): Promise<Book | null> {
    this.logger.log('\x1b[34m' + path + ' marcado como desaparecido.');
    return this.bookModel.findOneAndUpdate(
      { path },
      { missing: true },
      { new: true },
    );
  }
}
